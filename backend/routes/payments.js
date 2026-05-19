// ============================================================
// routes/payments.js — Billing & Ledger Router Matrix
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * GET /api/payments/summary/:ticketId
 * Compiles aggregated real-time financial ledger analytics 
 * (Labor + Parts Cost - Historical Payments = Outstanding Balance)
 */
router.get('/summary/:ticketId', async (req, res, next) => {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (!ticketId) return res.status(400).json({ error: 'Missing valid ticket reference ID.' });

    // 1. Fetch base labor fee and payment metadata
    const [tRows] = await pool.execute(
      'SELECT estimated_cost, payment_status FROM repair_tickets WHERE ticket_id = ?', 
      [ticketId]
    );
    if (!tRows.length) return res.status(404).json({ error: 'Repair ticket record not found.' });
    
    const laborCost = parseFloat(tRows[0].estimated_cost) || 0;
    const paymentStatus = tRows[0].payment_status || 'Unpaid';

    // 2. Aggregate mapped component costs from ticket_parts
    const [pRows] = await pool.execute(
      'SELECT SUM(quantity * unit_price) AS total_parts FROM ticket_parts WHERE ticket_id = ?',
      [ticketId]
    );
    const partsCost = parseFloat(pRows[0].total_parts) || 0;

    // 3. Sum up all historical payments registered on this ticket
    const [payRows] = await pool.execute(
      'SELECT SUM(amount) AS total_paid FROM payments WHERE ticket_id = ?',
      [ticketId]
    );
    const totalPaid = parseFloat(payRows[0].total_paid) || 0;

    // 4. Formulate aggregates
    const grandTotal = laborCost + partsCost;
    const remainingBalance = Math.max(0, grandTotal - totalPaid);

    res.json({
      ticket_id: ticketId,
      labor_cost: laborCost,
      parts_cost: partsCost,
      grand_total: grandTotal,
      total_paid: totalPaid,
      remaining_balance: remainingBalance,
      payment_status: paymentStatus
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/record
 * Logs a new cash payment transaction onto a ticket
 */
router.post('/record', async (req, res, next) => {
  try {
    const { ticket_id, amount, payment_method = 'Cash' } = req.body;
    
    if (!ticket_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'A valid ticket ID and payment amount are required.' });
    }

    // Insert payment row into ledger
    await pool.execute(
      'INSERT INTO payments (ticket_id, amount, payment_method, created_at) VALUES (?, ?, ?, NOW())',
      [ticket_id, parseFloat(amount), payment_method]
    );

    // Dynamic Recalculation Check to Auto-Update Master Ticket Status Flags
    const [tRows] = await pool.execute('SELECT estimated_cost FROM repair_tickets WHERE ticket_id = ?', [ticket_id]);
    const labor = parseFloat(tRows[0]?.estimated_cost) || 0;
    
    const [pRows] = await pool.execute('SELECT SUM(quantity * unit_price) AS parts FROM ticket_parts WHERE ticket_id = ?', [ticket_id]);
    const parts = parseFloat(pRows[0]?.total_parts) || 0;
    
    const [payRows] = await pool.execute('SELECT SUM(amount) AS paid FROM payments WHERE ticket_id = ?', [ticket_id]);
    const paid = parseFloat(payRows[0]?.total_paid) || 0;

    const totalCost = labor + parts;
    let newStatus = 'Unpaid';
    if (paid >= totalCost) newStatus = 'Paid';
    else if (paid > 0) newStatus = 'Partial';

    await pool.execute('UPDATE repair_tickets SET payment_status = ? WHERE ticket_id = ?', [newStatus, ticket_id]);

    res.json({ success: true, message: 'Transaction applied to ticket financial ledger.', current_status: newStatus });
  } catch (err) {
    next(err);
  }
});

module.exports = router;