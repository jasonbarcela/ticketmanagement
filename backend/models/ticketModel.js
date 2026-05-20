// ============================================================
// models/ticketModel.js — Repair Ticket SQL Query Layer (v2)
//
// All relational SQL queries for the normalized repair_tickets schema live here.
// Handled tables: repair_tickets, customers, devices, bookings.
// Dynamic links to ticket_parts are isolated to maintain strict context patterns.
// ============================================================
const pool = require('../config/db');

/**
 * Fetch all tickets with nested user and hardware relations.
 * Includes optional filters by customer/ticket search string and operational status.
 */
async function findAll({ search = '', status = '' } = {}) {
  let sql = `
    SELECT 
      rt.ticket_id,
      rt.ticket_number,
      rt.status,
      rt.service_type,
      rt.problem_desc,
      rt.address,
      rt.assigned_tech,
      rt.tech_contact,
      rt.tech_assigned_date,
      rt.estimated_cost,
      rt.payment_status,
      rt.received_date,
      rt.completed_date,
      rt.created_at,
      c.full_name AS customer_name,
      c.phone AS contact_number,
      c.email AS customer_email,
      d.device_type,
      d.brand AS device_brand,
      d.imei,
      d.passcode
    FROM repair_tickets rt
    LEFT JOIN customers c ON rt.customer_id = c.customer_id
    LEFT JOIN devices d ON rt.device_id = d.device_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ' AND (rt.ticket_number LIKE ? OR c.full_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += ' AND rt.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY rt.created_at DESC';

  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Fetch a single ticket with full customer, device, and structural layout data joined.
 */
async function findById(ticketId) {
  const [rows] = await pool.execute(
    `SELECT 
       rt.*,
       c.full_name AS customer_name,
       c.phone AS contact_number,
       c.email AS customer_email,
       c.address AS customer_address,
       d.device_type,
       d.brand AS device_brand,
       d.imei,
       d.passcode,
       b.downpayment_reference,
       b.downpayment_method,
       b.service_fee AS booking_service_fee
     FROM repair_tickets rt
     LEFT JOIN customers c ON rt.customer_id = c.customer_id
     LEFT JOIN devices d ON rt.device_id = d.device_id
     LEFT JOIN bookings b ON rt.booking_id = b.booking_id
     WHERE rt.ticket_id = ?`,
    [ticketId]
  );
  return rows[0] || null;
}

/**
 * Fetch explicit target identifiers for validation routines (status transitions).
 */
async function findStatusById(ticketId) {
  const [rows] = await pool.execute(
    `SELECT ticket_id, status, service_type, assigned_tech, tech_contact, tech_assigned_date
     FROM repair_tickets WHERE ticket_id = ?`,
    [ticketId]
  );
  return rows[0] || null;
}

/**
 * Atomic creation sequence. Encapsulates customer generation, device logging, 
 * and ticket reservation inside an isolated transactional pipeline.
 */
async function create(fields) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      customer_id, // provided if existing customer selection
      customer_name, contact_number, customer_email, customer_address,
      device_id,   // provided if existing device selection
      device_type, device_brand, imei, passcode,
      booking_id, problem_desc, service_type, address,
      preferred_schedule, service_date, preferred_time,
      assigned_tech, estimated_cost, status, received_date
    } = fields;

    let targetCustomerId = customer_id;
    let targetDeviceId = device_id;

    // 1. Resolve or Create Customer Entity
    if (!targetCustomerId && customer_name) {
      const [custResult] = await conn.execute(
        `INSERT INTO customers (full_name, phone, email, address) 
         VALUES (?, ?, ?, ?)`,
        [customer_name.trim(), contact_number || null, customer_email || null, customer_address || null]
      );
      targetCustomerId = custResult.insertId;
    }

    // 2. Resolve or Create Device Asset
    if (!targetDeviceId && device_type && device_brand) {
      const [devResult] = await conn.execute(
        `INSERT INTO devices (customer_id, device_type, brand, imei, passcode) 
         VALUES (?, ?, ?, ?, ?)`,
        [targetCustomerId, device_type, device_brand, imei || null, passcode || null]
      );
      targetDeviceId = devResult.insertId;
    }

    // 3. Create Ticket Record
    const [ticketResult] = await conn.execute(
      `INSERT INTO repair_tickets
         (ticket_number, customer_id, device_id, booking_id, problem_desc, 
          service_type, address, preferred_schedule, service_date, preferred_time,
          assigned_tech, estimated_cost, status, received_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'TK-TEMP',
        targetCustomerId,
        targetDeviceId,
        booking_id || null,
        problem_desc,
        service_type || 'Walk-In',
        address || null,
        preferred_schedule || null,
        service_date || null,
        preferred_time || null,
        assigned_tech || null,
        parseFloat(estimated_cost) || 0.00,
        status || 'Pending',
        received_date
      ]
    );

    await conn.commit();
    return ticketResult.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Patches temporary code tokens into verified system keys.
 */
async function patchTicketNumber(ticketId, ticketNumber) {
  await pool.execute(
    'UPDATE repair_tickets SET ticket_number = ? WHERE ticket_id = ?',
    [ticketNumber, ticketId]
  );
}

/**
 * Full transactional entity synchronization. Updates primary attributes, 
 * normalized customer values, and structural hardware records.
 */
async function update(ticketId, fields) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      customer_id, customer_name, contact_number, customer_email, customer_address,
      device_id, device_type, device_brand, imei, passcode,
      problem_desc, service_type, address, preferred_schedule,
      service_date, preferred_time,
      assigned_tech, tech_contact, tech_assigned_date,
      diagnostic_notes, repair_notes, additional_findings,
      customer_approval, estimated_cost, status, payment_status, completed_date
    } = fields;

    // 1. Update Normalized Customer Table Data
    if (customer_id) {
      await conn.execute(
        `UPDATE customers 
         SET full_name = ?, phone = ?, email = ?, address = ? 
         WHERE customer_id = ?`,
        [customer_name, contact_number, customer_email, customer_address, customer_id]
      );
    }

    // 2. Update Normalized Device Table Data
    if (device_id) {
      await conn.execute(
        `UPDATE devices 
         SET device_type = ?, brand = ?, imei = ?, passcode = ? 
         WHERE device_id = ?`,
        [device_type, device_brand, imei, passcode, device_id]
      );
    }

    if (!status || String(status).trim() === '') {
      throw new Error('Ticket status is required.');
    }

    // 3. Synchronize Core Ticket Entry Values
    await conn.execute(
      `UPDATE repair_tickets SET
         problem_desc = ?, service_type = ?, address = ?, preferred_schedule = ?,
         service_date = ?, preferred_time = ?,
         assigned_tech = ?, tech_contact = ?, tech_assigned_date = ?,
         diagnostic_notes = ?, repair_notes = ?,
         additional_findings = ?, estimated_cost = ?,
         status = ?, payment_status = ?, completed_date = ?
       WHERE ticket_id = ?`,
      [
        problem_desc, service_type, address, preferred_schedule,
        service_date || null,
        preferred_time ? String(preferred_time).slice(0, 5) : null,
        assigned_tech || null,
        tech_contact || null,
        tech_assigned_date || null,
        diagnostic_notes, repair_notes,
        additional_findings, parseFloat(estimated_cost) || 0.00,
        String(status).trim(),
        payment_status || 'Unpaid',
        completed_date || null,
        ticketId,
      ]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Isolated structural status modifier layout pattern.
 */
async function updateStatus(ticketId, status, completedDate = null) {
  await pool.execute(
    `UPDATE repair_tickets 
     SET status = ?, completed_date = ? 
     WHERE ticket_id = ?`,
    [status, completedDate, ticketId]
  );
}

/**
 * Hard delete configuration template. cascade parameters safely handle related logs or details.
 */
async function remove(ticketId) {
  await pool.execute('DELETE FROM repair_tickets WHERE ticket_id = ?', [ticketId]);
}

module.exports = {
  findAll,
  findById,
  findStatusById,
  create,
  patchTicketNumber,
  update,
  updateStatus,
  remove
};