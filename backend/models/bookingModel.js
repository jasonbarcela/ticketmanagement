// ============================================================
// models/bookingModel.js — Bookings Data Layer
//
// Manages the pre-ticket lifecycle for walk-in and home service bookings.
// Contains the atomic transactions that create and convert bookings into tickets.
// ============================================================
const pool = require('../config/db');
const { formatTicketNumber, today } = require('../utils/ticketHelpers');

/**
 * Fetch all bookings, optionally filtered by status.
 */
async function findAll({ status } = {}) {
  let query  = 'SELECT * FROM bookings';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';

  const [rows] = await pool.execute(query, params);
  return rows;
}

/**
 * Look up a single booking by ID.
 */
async function findById(bookingId) {
  const [rows] = await pool.execute(
    'SELECT * FROM bookings WHERE booking_id = ?',
    [bookingId]
  );
  return rows[0] || null;
}

/**
 * Public intake submission.
 *
 * Atomically:
 *   1. Inserts the booking row (with correct status).
 *   2. Resolves or creates the customer record.
 *   3. Creates a device record linked to that customer.
 *   4. Creates the repair ticket and generates its CL-YEAR-SEQUENCE number.
 *   5. Writes an initial entry to repair_logs.
 *
 * Returns { booking_id, ticket_id, ticket_number, status }
 * so the controller can send the ticket number straight to the customer.
 */
async function create(bookingData) {
  const {
    customer_name, contact_number, device_type,
    device_brand,  problem_desc,   service_type,
    address,       preferred_schedule, downpayment_note,
    status,        // 'Confirmed' | 'Pending Downpayment' — set by controller
  } = bookingData;

  const resolvedStatus      = status || (service_type === 'Home Service' ? 'Pending Downpayment' : 'Confirmed');
  const resolvedServiceType = service_type || 'Walk-In';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert the booking row
    const [bookingResult] = await conn.execute(
      `INSERT INTO bookings
         (customer_name, contact_number, device_type, device_brand,
          problem_desc, service_type, address, preferred_schedule,
          downpayment_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_name.trim(),
        contact_number        ? contact_number.trim()        : null,
        device_type           ? device_type.trim()           : null,
        device_brand          ? device_brand.trim()          : null,
        problem_desc.trim(),
        resolvedServiceType,
        address               ? address.trim()               : null,
        preferred_schedule    ? preferred_schedule.trim()    : null,
        downpayment_note      ? downpayment_note.trim()      : null,
        resolvedStatus,
      ]
    );
    const bookingId = bookingResult.insertId;

    // 2. Resolve or create the customer record
    let customerId;
    const [cRows] = await conn.execute(
      'SELECT customer_id FROM customers WHERE full_name = ? AND phone = ?',
      [customer_name.trim(), contact_number ? contact_number.trim() : null]
    );
    if (cRows.length > 0) {
      customerId = cRows[0].customer_id;
    } else {
      const [cResult] = await conn.execute(
        'INSERT INTO customers (full_name, phone, address) VALUES (?, ?, ?)',
        [customer_name.trim(), contact_number ? contact_number.trim() : null, address ? address.trim() : null]
      );
      customerId = cResult.insertId;
    }

    // 3. Create a device record linked to the customer
    const [dResult] = await conn.execute(
      'INSERT INTO devices (customer_id, device_type, brand) VALUES (?, ?, ?)',
      [customerId, device_type ? device_type.trim() : 'Unknown', device_brand ? device_brand.trim() : 'Unknown']
    );
    const deviceId = dResult.insertId;

    // 4. Create the repair ticket (temporary ticket_number, patched next)
    const [tResult] = await conn.execute(
      `INSERT INTO repair_tickets
         (ticket_number, customer_id, device_id, booking_id,
          problem_desc, service_type, address, preferred_schedule,
          status, received_date)
       VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        deviceId,
        bookingId,
        problem_desc.trim(),
        resolvedServiceType,
        address            ? address.trim()            : null,
        preferred_schedule ? preferred_schedule.trim() : null,
        resolvedStatus,
        today(),
      ]
    );
    const ticketId = tResult.insertId;

    // 5. Patch the real ticket number now that we have the ticket_id
    const ticketNumber = formatTicketNumber(ticketId);
    await conn.execute(
      'UPDATE repair_tickets SET ticket_number = ? WHERE ticket_id = ?',
      [ticketNumber, ticketId]
    );

    // 6. Write the initial repair log entry
    const logNote = resolvedServiceType === 'Home Service'
      ? 'Device received via Home Service request. Awaiting downpayment confirmation.'
      : 'Device received during customer walk-in.'
    await conn.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by)
       VALUES (?, 'Status Change', ?, 'system')`,
      [ticketId, logNote]
    );

    await conn.commit();

    return {
      booking_id:    bookingId,
      ticket_id:     ticketId,
      ticket_number: ticketNumber,   // e.g. "CL-2026-00042"
      status:        resolvedStatus,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Update a booking's status (e.g. to 'Cancelled').
 */
async function updateStatus(bookingId, status) {
  await pool.execute(
    'UPDATE bookings SET status = ? WHERE booking_id = ?',
    [status, bookingId]
  );
}

/**
 * Admin action: converts an existing booking into a full ticket
 * with tech assignment and cost estimate.
 *
 * Used when an admin manually approves a Home Service booking
 * after downpayment is confirmed.
 */
async function convertToTicket(bookingId, assignedTech, estimatedCost) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Lock and fetch the booking
    const [bRows] = await conn.execute(
      'SELECT * FROM bookings WHERE booking_id = ? FOR UPDATE',
      [bookingId]
    );
    if (!bRows.length) throw new Error('Booking not found.');
    const b = bRows[0];

    if (b.status === 'Approved') throw new Error('This booking has already been approved.');

    // 2. Resolve or create the customer
    let customerId;
    const [cRows] = await conn.execute(
      'SELECT customer_id FROM customers WHERE full_name = ? AND phone = ?',
      [b.customer_name, b.contact_number]
    );
    if (cRows.length > 0) {
      customerId = cRows[0].customer_id;
    } else {
      const [cResult] = await conn.execute(
        'INSERT INTO customers (full_name, phone, address) VALUES (?, ?, ?)',
        [b.customer_name, b.contact_number, b.address]
      );
      customerId = cResult.insertId;
    }

    // 3. Register the device
    const [dResult] = await conn.execute(
      'INSERT INTO devices (customer_id, device_type, brand) VALUES (?, ?, ?)',
      [customerId, b.device_type || 'Unknown', b.device_brand || 'Unknown']
    );
    const deviceId = dResult.insertId;

    // 4. Create the repair ticket
    const [tResult] = await conn.execute(
      `INSERT INTO repair_tickets
         (ticket_number, customer_id, device_id, booking_id,
          problem_desc, service_type, address, preferred_schedule,
          assigned_tech, estimated_cost, status, received_date)
       VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'In Progress', ?)`,
      [
        customerId, deviceId, bookingId,
        b.problem_desc, b.service_type, b.address, b.preferred_schedule,
        assignedTech || null,
        parseFloat(estimatedCost) || 0.00,
        today(),
      ]
    );
    const ticketId = tResult.insertId;

    // 5. Patch the ticket number
    const ticketNumber = formatTicketNumber(ticketId);
    await conn.execute(
      'UPDATE repair_tickets SET ticket_number = ? WHERE ticket_id = ?',
      [ticketNumber, ticketId]
    );

    // 6. Mark the booking as approved
    await conn.execute(
      'UPDATE bookings SET status = ? WHERE booking_id = ?',
      ['Approved', bookingId]
    );

    // 7. Initial log entry
    await conn.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by)
       VALUES (?, 'Status Change', 'Booking approved and assigned to technician.', 'system')`,
      [ticketId]
    );

    await conn.commit();
    return { ticketId, ticketNumber };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  findAll,
  findById,
  create,
  updateStatus,
  convertToTicket,
};