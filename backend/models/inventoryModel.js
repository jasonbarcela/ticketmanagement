// ============================================================
// models/inventoryModel.js — Inventory SQL Query Layer (v2)
//
// All inventory operations go through the relational database.
// Supports traditional stock item definitions and explicitly links 
// consumption trends to repair tickets through the ticket_parts schema.
// ============================================================
const pool = require('../config/db');

/**
 * Fetch all available catalog line items.
 */
async function findAll() {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory ORDER BY part_code ASC'
  );
  return rows;
}

/**
 * Fetch a part row using its alpha-numeric code identifier.
 */
async function findByPartCode(partCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE UPPER(part_code) = ?',
    [partCode.toUpperCase().trim()]
  );
  return rows[0] || null;
}

/**
 * Fetch an inventory row using its structural auto-increment ID.
 */
async function findById(partId) {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE part_id = ?',
    [partId]
  );
  return rows[0] || null;
}

/**
 * Direct administrative adjustments to basic balance counts.
 */
async function updateQuantity(partId, newQuantity) {
  await pool.execute(
    'UPDATE inventory SET quantity = ? WHERE part_id = ?',
    [newQuantity, partId]
  );
}

/**
 * Creates a brand new SKU option within the warehouse lookup list.
 */
async function addPart({ part_code, part_name, category, quantity, cost_price, retail_price }) {
  const [result] = await pool.execute(
    `INSERT INTO inventory (part_code, part_name, category, quantity, cost_price, retail_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      part_code.toUpperCase().trim(),
      part_name.trim(),
      category.trim(),
      parseInt(quantity, 10) || 0,
      parseFloat(cost_price) || 0.00,
      parseFloat(retail_price) || 0.00
    ]
  );
  return result.insertId;
}

/**
 * Fetches all inventory components linked to a specific repair ticket via ticket_parts.
 */
async function findPartsByTicketId(ticketId) {
  const [rows] = await pool.execute(
    `SELECT tp.*, i.part_name, i.part_code, i.category 
     FROM ticket_parts tp
     JOIN inventory i ON tp.part_id = i.part_id
     WHERE tp.ticket_id = ?`,
    [ticketId]
  );
  return rows;
}

/**
 * Atomically links an asset line item to a ticket and decrements stock quantity.
 * Runs inside a strict validation transaction block to eliminate race conditions.
 */
async function attachPartToTicket(ticketId, partId, quantityUsed) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Double-check stock availability
    const [invRows] = await conn.execute(
      'SELECT quantity, retail_price FROM inventory WHERE part_id = ? FOR UPDATE',
      [partId]
    );
    if (!invRows.length) throw new Error('Inventory catalog entry not found.');
    
    const targetItem = invRows[0];
    if (targetItem.quantity < quantityUsed) {
      throw new Error(`Insufficient inventory stock balance. Available: ${targetItem.quantity}`);
    }

    // 2. Link item to the ticket_parts tracking table
    await conn.execute(
      `INSERT INTO ticket_parts (ticket_id, part_id, quantity, unit_price)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [ticketId, partId, quantityUsed, targetItem.retail_price]
    );

    // 3. Atomically decrement stock without allowing negative balances
    await conn.execute(
      `UPDATE inventory 
       SET quantity = GREATEST(quantity - ?, 0) 
       WHERE part_id = ?`,
      [quantityUsed, partId]
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
 * Reverses consumption allocations by unlinking a part from a ticket and restoring stock balances.
 */
async function removePartFromTicket(ticketId, partId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch consumed context metrics
    const [tpRows] = await conn.execute(
      'SELECT quantity FROM ticket_parts WHERE ticket_id = ? AND part_id = ?',
      [ticketId, partId]
    );
    
    if (tpRows.length > 0) {
      const quantityToRestore = tpRows[0].quantity;

      // 2. Clear out matrix assignment row
      await conn.execute(
        'DELETE FROM ticket_parts WHERE ticket_id = ? AND part_id = ?',
        [ticketId, partId]
      );

      // 3. Restore hardware units back to the main shelf
      await conn.execute(
        'UPDATE inventory SET quantity = quantity + ? WHERE part_id = ?',
        [quantityToRestore, partId]
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
 * Formulates sequential code strings based on existing data.
 */
async function generateNextPartCode() {
  const [rows] = await pool.execute(
    `SELECT MAX(CAST(SUBSTRING_INDEX(part_code, '-', -1) AS UNSIGNED)) AS max_num 
     FROM inventory WHERE part_code LIKE 'PRT-%'`
  );
  
  const nextNum = (rows[0] && rows[0].max_num) ? rows[0].max_num + 1 : 1;
  return `PRT-${String(nextNum).padStart(3, '0')}`;
}

module.exports = {
  findAll,
  findByPartCode,
  findById,
  updateQuantity,
  addPart,
  findPartsByTicketId,
  attachPartToTicket,
  removePartFromTicket,
  generateNextPartCode
};