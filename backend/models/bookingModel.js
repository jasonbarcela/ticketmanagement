// ============================================================
// models/bookingModel.js — Bookings Data Layer
//
// Manages the pre-ticket lifecycle for walk-in and home service bookings.
// Contains the atomic transactions that create and convert bookings into tickets.
// ============================================================
const pool = require('../config/db');
const { formatTicketNumber, today } = require('../utils/ticketHelpers');
const { normalizeHomeServiceStatus } = require('../utils/homeServiceStatuses');

/**
 * Fetch all bookings, optionally filtered by status.
 */
async function findAll({ status } = {}) {
  let query = `
    SELECT b.*,
           rt.ticket_id,
           rt.ticket_number,
           rt.status AS ticket_status
    FROM bookings b
    LEFT JOIN repair_tickets rt ON rt.booking_id = b.booking_id
  `;
  const params = [];

  if (status) {
    query += ' WHERE b.status = ?';
    params.push(status);
  }
  query += ' ORDER BY b.created_at DESC';

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
    device_brand, imei, passcode, problem_desc, service_type,
    address,       preferred_schedule, service_date, preferred_time,
    email,                   // customer email — optional
    downpayment_method,      // preferred payment method
    downpayment_reference,   // reference number if already sent
    downpayment_note,        // free-text note
    payment_status,          // 'Unpaid' | 'Partial' | 'Paid'
    customer_provided_parts, // boolean
    service_fee,             // quoted service fee
    status,                  // repair ticket status — set by controller
  } = bookingData;

  const resolvedStatus      = status || 'Pending';
  const resolvedServiceType = service_type || 'Walk-In';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert the booking row
    const [bookingResult] = await conn.execute(
      `INSERT INTO bookings
         (customer_name, contact_number, customer_email, device_type, device_brand,
          problem_desc, service_type, address, preferred_schedule, service_date, preferred_time,
          downpayment_method, downpayment_reference, downpayment_note,
          payment_status, customer_provided_parts, service_fee, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_name.trim(),
        contact_number        ? contact_number.trim()        : null,
        email                 ? email.trim()                 : null,
        device_type           ? device_type.trim()           : null,
        device_brand          ? device_brand.trim()          : null,
        problem_desc.trim(),
        resolvedServiceType,
        address               ? address.trim()               : null,
        preferred_schedule    ? preferred_schedule.trim()    : null,
        service_date          || null,
        preferred_time        ? preferred_time.trim()        : null,
        downpayment_method    ? downpayment_method.trim()    : null,
        downpayment_reference ? downpayment_reference.trim() : null,
        downpayment_note      ? downpayment_note.trim()      : null,
        payment_status        || 'Unpaid',
        customer_provided_parts ? 1 : 0,
        parseFloat(service_fee) || 0.00,
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
        'INSERT INTO customers (full_name, phone, email, address) VALUES (?, ?, ?, ?)',
        [customer_name.trim(), contact_number ? contact_number.trim() : null, email ? email.trim() : null, address ? address.trim() : null]
      );
      customerId = cResult.insertId;
    }

    // 3. Create a device record linked to the customer
    const [dResult] = await conn.execute(
      'INSERT INTO devices (customer_id, device_type, brand, imei, passcode) VALUES (?, ?, ?, ?, ?)',
      [
        customerId,
        device_type ? device_type.trim() : 'Unknown',
        device_brand ? device_brand.trim() : 'Unknown',
        imei ? imei.trim() : null,
        passcode ? passcode.trim() : null,
      ]
    );
    const deviceId = dResult.insertId;

    // 4. Create the repair ticket (temporary ticket_number, patched next)
    const [tResult] = await conn.execute(
      `INSERT INTO repair_tickets
         (ticket_number, customer_id, device_id, booking_id,
          problem_desc, service_type, address, preferred_schedule, service_date, preferred_time,
          estimated_cost, status, received_date)
       VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        deviceId,
        bookingId,
        problem_desc.trim(),
        resolvedServiceType,
        address            ? address.trim()            : null,
        preferred_schedule ? preferred_schedule.trim() : null,
        service_date       || null,
        preferred_time     ? preferred_time.trim()     : null,
        parseFloat(service_fee) || 0.00,
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
      ? 'Home service request submitted.'
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
 * Admin approves a home service booking (ticket already exists from intake).
 * Status → Approved. Technician is assigned later in Edit Ticket.
 */
async function approveBooking(bookingId, operator = 'system') {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [bRows] = await conn.execute(
      'SELECT * FROM bookings WHERE booking_id = ? FOR UPDATE',
      [bookingId]
    );
    if (!bRows.length) throw new Error('Booking not found.');
    const b = bRows[0];

    if (b.status === 'Approved') throw new Error('This booking has already been approved.');
    if (b.status === 'Cancelled') throw new Error('Cannot approve a cancelled booking.');

    const [tRows] = await conn.execute(
      'SELECT ticket_id, status, service_type FROM repair_tickets WHERE booking_id = ? FOR UPDATE',
      [bookingId]
    );
    if (!tRows.length) throw new Error('No repair ticket linked to this booking.');
    const ticket = tRows[0];

    if (ticket.service_type !== 'Home Service') {
      throw new Error('Only home service bookings use this approval flow.');
    }

    const ticketStatus = normalizeHomeServiceStatus(ticket.status);

    if (['On The Way', 'Completed', 'Cancelled'].includes(ticketStatus)) {
      throw new Error('Only pending home service tickets can be approved.');
    }
    if (!['Pending', 'Approved'].includes(ticketStatus)) {
      throw new Error('Only pending home service tickets can be approved.');
    }

    await conn.execute(
      'UPDATE repair_tickets SET status = ? WHERE ticket_id = ?',
      ['Approved', ticket.ticket_id]
    );
    await conn.execute(
      'UPDATE bookings SET status = ? WHERE booking_id = ?',
      ['Approved', bookingId]
    );
    await conn.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by)
       VALUES (?, 'Status Change', 'Booking approved.', ?)`,
      [ticket.ticket_id, operator]
    );

    const [[{ ticket_number: ticketNumber }]] = await conn.execute(
      'SELECT ticket_number FROM repair_tickets WHERE ticket_id = ?',
      [ticket.ticket_id]
    );

    await conn.commit();
    return {
      ticketId: ticket.ticket_id,
      ticketNumber,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Cancel booking and linked ticket.
 */
async function cancelBooking(bookingId, operator = 'system') {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [bRows] = await conn.execute(
      'SELECT booking_id, status FROM bookings WHERE booking_id = ? FOR UPDATE',
      [bookingId]
    );
    if (!bRows.length) throw new Error('Booking not found.');

    await conn.execute(
      'UPDATE bookings SET status = ? WHERE booking_id = ?',
      ['Cancelled', bookingId]
    );

    const [tRows] = await conn.execute(
      'SELECT ticket_id FROM repair_tickets WHERE booking_id = ?',
      [bookingId]
    );
    if (tRows.length) {
      await conn.execute(
        'UPDATE repair_tickets SET status = ? WHERE ticket_id = ?',
        ['Cancelled', tRows[0].ticket_id]
      );
      await conn.execute(
        `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by)
         VALUES (?, 'Status Change', 'Home service booking cancelled.', ?)`,
        [tRows[0].ticket_id, operator]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Keep bookings.status aligned with linked home service ticket status.
 * Booking ENUM: Pending | Approved | Cancelled
 */
async function syncBookingFromTicket(ticketId, ticketStatus) {
  const bookingStatus =
    ticketStatus === 'Cancelled'
      ? 'Cancelled'
      : ['Approved', 'On The Way', 'Completed'].includes(ticketStatus)
        ? 'Approved'
        : 'Pending';

  await pool.execute(
    `UPDATE bookings b
     INNER JOIN repair_tickets rt ON rt.booking_id = b.booking_id
     SET b.status = ?
     WHERE rt.ticket_id = ?
       AND rt.service_type = 'Home Service'
       AND b.status != ?`,
    [bookingStatus, ticketId, bookingStatus]
  );
}

module.exports = {
  findAll,
  findById,
  create,
  updateStatus,
  approveBooking,
  cancelBooking,
  syncBookingFromTicket,
};