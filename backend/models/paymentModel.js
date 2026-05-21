// ============================================================
// models/paymentModel.js — Payments & Billing Data Layer
//
// Handles raw SQL queries for the payments table. Encapsulates
// structural ledger aggregation (Labor + Parts total costs).
// ============================================================
const pool = require('../config/db');
const { DOWNPAYMENT_AMOUNT } = require('../utils/homeServiceConfig');

/**
 * Calculates a ticket's financial standing: computes service labor costs,
 * sums mapped components inside ticket_parts, and reviews total payments made.
 */
async function getBillingSummary(ticketId) {
  // 1. Grab base ticket metrics (estimated_cost as service/labor)
  const [ticketRows] = await pool.execute(
    `SELECT rt.ticket_id, rt.estimated_cost, rt.service_type, rt.status,
            b.downpayment_reference, b.downpayment_method
     FROM repair_tickets rt
     LEFT JOIN bookings b ON rt.booking_id = b.booking_id
     WHERE rt.ticket_id = ?`,
    [ticketId]
  );
  if (!ticketRows.length) return null;

  const row = ticketRows[0];
  const laborCost = parseFloat(row.estimated_cost) || 0.00;
  const isHomePending =
    row.service_type === 'Home Service' && row.status === 'Pending';

  // 2. Aggregate structural values of linked parts from ticket_parts matrix
  const [partsRows] = await pool.execute(
    'SELECT SUM(quantity * unit_price) AS parts_total FROM ticket_parts WHERE ticket_id = ?',
    [ticketId]
  );
  const partsCost = parseFloat(partsRows[0].parts_total) || 0.00;

  // 3. Aggregate all transaction payment records matching this ticket ID
  const [paymentRows] = await pool.execute(
    'SELECT SUM(amount_paid) AS total_paid FROM payments WHERE ticket_id = ?',
    [ticketId]
  );
  const totalPaid = parseFloat(paymentRows[0].total_paid) || 0.00;

  const grandTotal = laborCost + partsCost;
  const remainingBalance = Math.max(0, grandTotal - totalPaid);

  // Determine normalized billing classification string
  let calculatedStatus = 'Unpaid';
  if (totalPaid > 0) {
    calculatedStatus = remainingBalance === 0 ? 'Paid' : 'Partial';
  }

  return {
    ticket_id: ticketId,
    labor_cost: laborCost,
    parts_cost: partsCost,
    grand_total: grandTotal,
    total_paid: totalPaid,
    remaining_balance: remainingBalance,
    payment_status: calculatedStatus,
    downpayment_reference: row.downpayment_reference || null,
    downpayment_method: row.downpayment_method || null,
    expected_downpayment: isHomePending ? DOWNPAYMENT_AMOUNT : 0,
  };
}

/**
 * Fetch historical line payments recorded for a single repair ticket.
 */
async function findPaymentsByTicketId(ticketId) {
  const [rows] = await pool.execute(
    'SELECT * FROM payments WHERE ticket_id = ? ORDER BY paid_at DESC',
    [ticketId]
  );
  return rows;
}

/**
 * Atomic processing block. Logs a ledger payment and updates 
 * the underlying ticket's operational payment status mapping flag.
 */
async function recordPayment({ ticket_id, amount_paid, payment_method, notes, recorded_by }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert ledger record row
    await conn.execute(
      `INSERT INTO payments (ticket_id, amount_paid, payment_method, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [ticket_id, parseFloat(amount_paid), payment_method || 'Cash', notes || null, recorded_by]
    );

    // 2. Compute live balances after payment ingestion to confirm transition states
    const [tRows] = await conn.execute('SELECT estimated_cost FROM repair_tickets WHERE ticket_id = ? FOR UPDATE', [ticket_id]);
    const labor = parseFloat(tRows[0].estimated_cost) || 0;

    const [pRows] = await conn.execute('SELECT SUM(quantity * unit_price) AS parts_total FROM ticket_parts WHERE ticket_id = ?', [ticket_id]);
    const parts = parseFloat(pRows[0].parts_total) || 0;

    const [pmRows] = await conn.execute('SELECT SUM(amount_paid) AS total_paid FROM payments WHERE ticket_id = ?', [ticket_id]);
    const paid = parseFloat(pmRows[0].total_paid) || 0;

    const totalCost = labor + parts;
    let nextStatus = 'Unpaid';
    if (paid > 0) {
      nextStatus = (totalCost - paid) <= 0 ? 'Paid' : 'Partial';
    }

    // 3. Force synchronization back onto the main ticket entity
    await conn.execute(
      'UPDATE repair_tickets SET payment_status = ? WHERE ticket_id = ?',
      [nextStatus, ticket_id]
    );

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  getBillingSummary,
  findPaymentsByTicketId,
  recordPayment
};