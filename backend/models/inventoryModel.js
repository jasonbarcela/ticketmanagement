// ============================================================
// models/inventoryModel.js — Phone Repair Shop Inventory Layer
//
// Simplified inventory management for phone repair parts only.
// Tracks stock in/out, links parts to repair tickets,
// and supports customer-provided parts (no stock deduction).
// ============================================================
const pool = require('../config/db');

/**
 * Fetch all inventory parts ordered by category then name.
 */
async function findAll() {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory ORDER BY category ASC, part_name ASC'
  );
  return rows;
}

/**
 * Fetch a single part by its code (e.g. PRT-001).
 */
async function findByPartCode(partCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE UPPER(part_code) = ?',
    [partCode.toUpperCase().trim()]
  );
  return rows[0] || null;
}

/**
 * Fetch a single part by its numeric ID.
 */
async function findById(partId) {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE part_id = ?',
    [partId]
  );
  return rows[0] || null;
}

/**
 * Directly set the stock quantity for a part (admin stock-in/out).
 * Does NOT change prices — existing prices remain untouched.
 */
async function updateQuantity(partId, newQuantity) {
  await pool.execute(
    'UPDATE inventory SET quantity = ? WHERE part_id = ?',
    [newQuantity, partId]
  );
}

/**
 * Add a new phone repair part to the catalogue.
 * Restricted categories enforce phone-repair-only stock.
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
      parseFloat(retail_price) || 0.00,
    ]
  );
  return result.insertId;
}

/**
 * Fetch all parts used in a specific repair ticket.
 * Includes customer_provided flag so UI can distinguish shop vs customer parts.
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
 * Attach a part to a ticket and deduct stock.
 *
 * If customer_provided = true → records the part on the ticket
 * but does NOT deduct shop inventory stock.
 *
 * If customer_provided = false → deducts stock atomically,
 * preventing negative balances.
 */
async function attachPartToTicket(ticketId, partId, quantityUsed, customerProvided = false) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify the part exists and get pricing
    const [invRows] = await conn.execute(
      'SELECT quantity, retail_price FROM inventory WHERE part_id = ? FOR UPDATE',
      [partId]
    );
    if (!invRows.length) throw new Error('Part not found in inventory.');

    const part = invRows[0];

    // 2. Stock check — only when shop is providing the part
    if (!customerProvided && part.quantity < quantityUsed) {
      throw new Error(`Insufficient stock. Available: ${part.quantity}`);
    }

    // 3. Record part on ticket
    //    unit_price = 0 when customer provides the part (labor fee covers the job)
    const unitPrice = customerProvided ? 0.00 : part.retail_price;
    await conn.execute(
      `INSERT INTO ticket_parts (ticket_id, part_id, quantity, unit_price)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [ticketId, partId, quantityUsed, unitPrice]
    );

    // 4. Deduct stock only when shop provides the part
    if (!customerProvided) {
      await conn.execute(
        `UPDATE inventory
         SET quantity = GREATEST(quantity - ?, 0)
         WHERE part_id = ?`,
        [quantityUsed, partId]
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
 * Remove a part from a ticket and restore stock if shop had provided it.
 * Customer-provided parts (unit_price = 0) do not restore stock.
 */
async function removePartFromTicket(ticketId, partId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [tpRows] = await conn.execute(
      'SELECT quantity, unit_price FROM ticket_parts WHERE ticket_id = ? AND part_id = ?',
      [ticketId, partId]
    );

    if (tpRows.length > 0) {
      const { quantity: qty, unit_price } = tpRows[0];
      const wasCustomerProvided = parseFloat(unit_price) === 0;

      // Remove from ticket
      await conn.execute(
        'DELETE FROM ticket_parts WHERE ticket_id = ? AND part_id = ?',
        [ticketId, partId]
      );

      // Restore stock only if the shop had provided this part
      if (!wasCustomerProvided && qty > 0) {
        await conn.execute(
          'UPDATE inventory SET quantity = quantity + ? WHERE part_id = ?',
          [qty, partId]
        );
      }
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
 * Fetch low-stock parts (quantity <= threshold, default 3).
 * Used for low-stock alerts on the inventory page.
 */
async function findLowStock(threshold = 3) {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE quantity <= ? ORDER BY quantity ASC',
    [threshold]
  );
  return rows;
}

/**
 * Generate the next sequential PRT-XXX code.
 */
async function generateNextPartCode() {
  const [rows] = await pool.execute(
    `SELECT MAX(CAST(SUBSTRING_INDEX(part_code, '-', -1) AS UNSIGNED)) AS max_num
     FROM inventory WHERE part_code LIKE 'PRT-%'`
  );
  const nextNum = (rows[0]?.max_num) ? rows[0].max_num + 1 : 1;
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
  findLowStock,
  generateNextPartCode,
};