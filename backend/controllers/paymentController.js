const PaymentModel = require('../models/paymentModel');
const AppError = require('../utils/AppError');

async function getSummary(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (!ticketId) throw new AppError('Invalid or missing ticket ID.', 400);

    const summary = await PaymentModel.getBillingSummary(ticketId);
    if (!summary) throw new AppError('Ticket not found.', 404);

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (!ticketId) throw new AppError('Invalid ticket ID.', 400);

    const history = await PaymentModel.findPaymentsByTicketId(ticketId);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

async function processPayment(req, res, next) {
  try {
    const { ticket_id, amount_paid, payment_method, notes } = req.body;
    let operator = 'system';
    try {
      if (req.headers['x-user']) {
        const u = JSON.parse(req.headers['x-user']);
        operator = u.username || 'system';
      }
    } catch (_) { /* keep default */ }

    const parsedTicketId = parseInt(ticket_id, 10);
    const parsedAmount = parseFloat(amount_paid);

    if (!parsedTicketId || isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Amount paid must be a positive number.', 400);
    }

    const result = await PaymentModel.recordPayment({
      ticket_id: parsedTicketId,
      amount_paid: parsedAmount,
      payment_method,
      notes,
      recorded_by: operator,
    });

    res.json({
      success: true,
      message: `Payment of ₱${parsedAmount.toFixed(2)} recorded successfully.`,
      payment_status: result.payment_status,
      remaining_balance: result.remaining_balance,
      total_paid: result.total_paid,
      grand_total: result.grand_total,
      labor_cost: result.labor_cost,
      parts_cost: result.parts_cost,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getHistory, processPayment };