// ============================================================
// controllers/paymentController.js — Billing & Ledger Logic
//
// Orchestrates invoice computations and processes incoming payments.
// ============================================================

const PaymentModel = require('../models/paymentModel');
const AppError = require('../utils/AppError');

// ── GET /api/payments/summary/:ticketId ──────────────────────
async function getSummary(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (!ticketId) throw new AppError('Invalid or missing ticket ID context.', 400);

    const summary = await PaymentModel.getBillingSummary(ticketId);
    if (!summary) throw new AppError('Ticket financial target not found.', 404);

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/payments/ticket/:ticketId ───────────────────────
async function getHistory(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (!ticketId) throw new AppError('Invalid ticket reference parameter.', 400);

    const history = await PaymentModel.findPaymentsByTicketId(ticketId);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/payments ───────────────────────────────────────
async function processPayment(req, res, next) {
  try {
    const { ticket_id, amount_paid, payment_method, notes } = req.body;
    const operator = req.headers['x-user'] || 'system';

    const parsedTicketId = parseInt(ticket_id, 10);
    const parsedAmount = parseFloat(amount_paid);

    if (!parsedTicketId || isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Amount paid must be a positive number layout configuration value.', 400);
    }

    await PaymentModel.recordPayment({
      ticket_id: parsedTicketId,
      amount_paid: parsedAmount,
      payment_method,
      notes,
      recorded_by: operator
    });

    res.json({
      success: true,
      message: `Transaction record logged: ₱${parsedAmount.toFixed(2)} captured successfully.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getHistory,
  processPayment
};