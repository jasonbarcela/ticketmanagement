// models/staffModel.js — Staff / technician account management
const pool = require('../config/db');
const { hashPassword } = require('../utils/password');

async function findByUsername(username) {
  const [rows] = await pool.execute(
    'SELECT user_id, username, password, role, full_name, created_by, created_at FROM staff_users WHERE username = ?',
    [username.trim()]
  );
  return rows[0] || null;
}

async function createTechnicianAccount({ username, full_name, password, created_by }) {
  const hash = await hashPassword(password);
  const [result] = await pool.execute(
    `INSERT INTO staff_users (username, password, full_name, role, created_by, is_active)
     VALUES (?, ?, ?, 'technician', ?, 1)`,
    [username.trim(), hash, full_name.trim(), created_by || null]
  );
  return result.insertId;
}

async function getAllTechnicians() {
  const [rows] = await pool.execute(
    `SELECT user_id, username, full_name, created_by, created_at
     FROM staff_users
     WHERE role = 'technician' AND is_active = 1
     ORDER BY full_name ASC`
  );
  return rows;
}

async function getTechnicianByUsername(username) {
  const [rows] = await pool.execute(
    `SELECT user_id, username, full_name, created_by, created_at
     FROM staff_users
     WHERE username = ? AND role = 'technician' AND is_active = 1
     LIMIT 1`,
    [username.trim()]
  );
  return rows[0] || null;
}

async function getAssignedTicketsForTechnician(tech) {
  const name = (tech.full_name || '').trim();
  const user = (tech.username || '').trim();
  const [rows] = await pool.execute(
    `SELECT
       rt.ticket_id,
       rt.ticket_number,
       rt.status,
       rt.service_type,
       rt.received_date,
       rt.payment_status,
       c.full_name AS customer_name,
       d.device_type,
       d.brand AS device_brand
     FROM repair_tickets rt
     LEFT JOIN customers c ON rt.customer_id = c.customer_id
     LEFT JOIN devices d ON rt.device_id = d.device_id
     WHERE rt.status NOT IN ('Completed', 'Cancelled')
       AND (
         TRIM(rt.assigned_tech) = ?
         OR TRIM(rt.assigned_tech) = ?
       )
     ORDER BY rt.created_at DESC`,
    [name, user]
  );
  return rows;
}

module.exports = {
  findByUsername,
  createTechnicianAccount,
  getAllTechnicians,
  getTechnicianByUsername,
  getAssignedTicketsForTechnician,
};
