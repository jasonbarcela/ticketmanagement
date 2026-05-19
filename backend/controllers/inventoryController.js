// ============================================================
// controllers/inventoryController.js — Parts Inventory Logic (v2)
//
// Handles catalog lookups and manages complex part assignments 
// on tickets via the normalized ticket_parts schema.
// ============================================================

const InvModel = require('../models/inventoryModel');
const { validateStockAdjust, validateNewPart } = require('../validators/inventoryValidator');
const AppError = require('../utils/AppError');

// ── GET /api/inventory ───────────────────────────────────────
async function getAll(_req, res, next) {
  try {
    const parts = await InvModel.findAll();
    res.json(parts);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/inventory/update ───────────────────────────────
// Accepts: { part_id: "PRT-001", new_quantity: 10 }
async function adjustStock(req, res, next) {
  try {
    const err = validateStockAdjust(req.body);
    if (err) throw new AppError(err, 400);

    const partCode = String(req.body.part_id).trim().toUpperCase();
    const qty = parseInt(req.body.new_quantity, 10);

    const part = await InvModel.findByPartCode(partCode);
    if (!part) {
      throw new AppError(
        `Part "${partCode}" not found. Use POST /api/inventory/add to create a new entry.`,
        404
      );
    }

    const previousQty = part.quantity;
    await InvModel.updateQuantity(part.part_id, qty);

    res.json({
      success: true,
      part_id: part.part_id,
      part_code: part.part_code,
      part_name: part.part_name,
      previous_quantity: previousQty,
      new_quantity: qty,
      message: `Stock for "${part.part_name}" updated to ${qty} unit(s).`,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/inventory/add ──────────────────────────────────
async function addPart(req, res, next) {
  try {
    const err = validateNewPart(req.body);
    if (err) throw new AppError(err, 400);

    const {
      part_name,
      category = 'Uncategorized',
      quantity = 0,
      cost_price = 0,
      retail_price = 0
    } = req.body;

    const nameClean = part_name.trim();

    // Prevent duplicate entries by checking the database catalog names
    const all = await InvModel.findAll();
    const dupl = all.find(p => p.part_name.toLowerCase() === nameClean.toLowerCase());
    if (dupl) {
      throw new AppError(
        `A part named "${nameClean}" already exists as ${dupl.part_code}. Use /api/inventory/update to adjust stock.`,
        409
      );
    }

    const nextCode = await InvModel.generateNextPartCode();
    const qty = Math.max(0, parseInt(quantity, 10) || 0);
    const costPrice = Math.max(0, parseFloat(cost_price) || 0);
    const retailPrice = Math.max(0, parseFloat(retail_price) || 0);

    const insertId = await InvModel.addPart({
      part_code: nextCode,
      part_name: nameClean,
      category: category.trim() || 'Uncategorized',
      quantity: qty,
      cost_price: costPrice,
      retail_price: retailPrice
    });

    res.status(201).json({
      success: true,
      part: {
        part_id: insertId,
        part_code: nextCode,
        part_name: nameClean,
        category,
        quantity: qty,
        cost_price: costPrice,
        retail_price: retailPrice
      },
      message: `New part "${nameClean}" added as ${nextCode}.`,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/inventory/ticket/:ticketId ──────────────────────
// Retrieves all tracking allocations applied against an active ticket
async function getTicketParts(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    if (!ticketId) throw new AppError('Invalid or missing ticket identifier.', 400);

    const allocations = await InvModel.findPartsByTicketId(ticketId);
    res.json(allocations);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/inventory/ticket/attach ────────────────────────
// Allocates structural quantities of a hardware part to a ticket
async function attachPart(req, res, next) {
  try {
    const { ticket_id, part_id, quantity = 1 } = req.body;
    
    const parsedTicketId = parseInt(ticket_id, 10);
    const parsedPartId = parseInt(part_id, 10);
    const qtyUsed = parseInt(quantity, 10);

    if (!parsedTicketId || !parsedPartId || qtyUsed <= 0) {
      throw new AppError('Invalid assignment parameters specified.', 400);
    }

    await InvModel.attachPartToTicket(parsedTicketId, parsedPartId, qtyUsed);

    res.json({
      success: true,
      message: 'Component successfully allocated to repair ticket, and inventory balances updated.'
    });
  } catch (err) {
    // Intercept database model transaction failures gracefully
    if (err.message.includes('Insufficient') || err.message.includes('not found')) {
      return next(new AppError(err.message, 400));
    }
    next(err);
  }
}

// ── DELETE /api/inventory/ticket/:ticketId/detach/:partId ────
// Unlinks a part allocation from a ticket and returns units to stock
async function detachPart(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId, 10);
    const partId = parseInt(req.params.partId, 10);

    if (!ticketId || !partId) {
      throw new AppError('Invalid removal reference path arguments.', 400);
    }

    await InvModel.removePartFromTicket(ticketId, partId);

    res.json({
      success: true,
      message: 'Allocation reversed: part unlinked and units returned to stock.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  adjustStock,
  addPart,
  getTicketParts,
  attachPart,
  detachPart
};