// ============================================================
// controllers/repairController.js — Repair Parts Workflow
//
// Handles attaching/detaching parts to repair tickets.
// Supports "Customer Provided Parts" — prevents stock deduction
// when the customer brings their own part.
//
// Labor/service fee is tracked separately from parts price.
// ============================================================

const InvModel = require('../models/inventoryModel');
const AppError = require('../utils/AppError');

// ── GET /api/inventory/ticket/:ticketId ──────────────────────
// Returns all parts recorded against a ticket (shop + customer-provided).
async function getTicketParts(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (!ticketId) throw new AppError('Invalid ticket ID.', 400);

    const parts = await InvModel.findPartsByTicketId(ticketId);
    res.json(parts);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/inventory/ticket/attach ────────────────────────
// Attach a part to a ticket.
//
// Body:
//   ticket_id          — repair ticket ID
//   part_id            — inventory part ID
//   quantity           — how many units (default 1)
//   customer_provided  — boolean; if true, stock is NOT deducted
//
// When customer_provided = false (default):
//   • Checks shop stock availability
//   • Deducts stock on success
//   • Records unit_price from retail_price snapshot
//
// When customer_provided = true:
//   • No stock check or deduction
//   • Records unit_price as 0.00 (customer bears part cost)
//   • Service/labor fee still applies to the ticket separately
async function attachPart(req, res, next) {
  try {
    const { ticket_id, part_id, quantity = 1, customer_provided = false } = req.body;

    const parsedTicketId = parseInt(ticket_id, 10);
    const parsedPartId   = parseInt(part_id, 10);
    const qtyUsed        = parseInt(quantity, 10);
    const isCustomer     = Boolean(customer_provided);

    if (!parsedTicketId || !parsedPartId || qtyUsed <= 0) {
      throw new AppError('ticket_id, part_id, and a positive quantity are required.', 400);
    }

    await InvModel.attachPartToTicket(parsedTicketId, parsedPartId, qtyUsed, isCustomer);

    res.json({
      success: true,
      customer_provided: isCustomer,
      message: isCustomer
        ? 'Customer-provided part recorded. Stock not deducted.'
        : 'Part attached and stock deducted from inventory.',
    });
  } catch (err) {
    if (
      err.message.includes('Insufficient') ||
      err.message.includes('not found') ||
      err.message.includes('already attached')
    ) {
      return next(new AppError(err.message, 400));
    }
    next(err);
  }
}

// ── DELETE /api/inventory/ticket/:ticketId/detach/:partId ────
// Remove a part from a ticket.
// Restores stock only if the shop had provided the part (unit_price > 0).
// Customer-provided parts (unit_price = 0) do not affect stock.
async function detachPart(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    const partId   = parseInt(req.params.partId, 10);

    if (!ticketId || !partId) {
      throw new AppError('Valid ticketId and partId are required.', 400);
    }

    await InvModel.removePartFromTicket(ticketId, partId);

    res.json({
      success: true,
      message: 'Part removed from ticket. Stock restored if shop-provided.',
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/inventory/low-stock ─────────────────────────────
// Returns parts at or below the low-stock threshold (default 3).
// Used by the inventory page to surface alerts.
async function getLowStock(req, res, next) {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 3;
    const parts = await InvModel.findLowStock(threshold);
    res.json(parts);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTicketParts,
  attachPart,
  detachPart,
  getLowStock,
};