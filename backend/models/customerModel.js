// ============================================================
// models/customerModel.js — Customer Aggregation Query Layer
//
// Manages profiles and compiles historical records across 
// devices and tickets for defense-grade customer tracking.
// ============================================================
const pool = require('../config/db');

/**
 * Fetches all customers with a dynamic sub-query tracking how many 
 * total active or completed tickets they have on file.
 */
async function findAll({ search = '' } = {}) {
  let query = `
    SELECT c.*, 
           COUNT(DISTINCT d.device_id) AS total_devices,
           COUNT(DISTINCT t.ticket_id) AS total_tickets
    FROM customers c
    LEFT JOIN devices d ON c.customer_id = d.customer_id
    LEFT JOIN repair_tickets t ON c.customer_id = t.customer_id
  `;
  const params = [];

  if (search.trim()) {
    query += ' WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?';
    const wild = `%${search.trim()}%`;
    params.push(wild, wild, wild);
  }

  query += ' GROUP BY c.customer_id ORDER BY c.full_name ASC';
  const [rows] = await pool.execute(query, params);
  return rows;
}

/**
 * Compiles a deep profile breakdown for a single customer.
 * Returns core attributes, registered hardware assets, and historical tickers.
 */
async function findProfileById(customerId) {
  // 1. Get base customer records
  const [cRows] = await pool.execute('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
  if (!cRows.length) return null;
  const customer = cRows[0];

  // 2. Get all hardware assets registered to this profile
  const [devices] = await pool.execute('SELECT * FROM devices WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);

  // 3. Gather full multi-year history log of repair tickets
  const [tickets] = await pool.execute(
    `SELECT t.ticket_id, t.ticket_number, t.problem_desc, t.status, t.payment_status, t.received_date,
            d.device_type, d.brand
     FROM repair_tickets t
     JOIN devices d ON t.device_id = d.device_id
     WHERE t.customer_id = ?
     ORDER BY t.received_date DESC`,
    [customerId]
  );

  return {
    ...customer,
    devices,
    tickets
  };
}

module.exports = {
  findAll,
  findProfileById
};