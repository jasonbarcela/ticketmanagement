// ============================================================
// controllers/ticketController.js
// ============================================================
const TicketModel = require('../models/ticketModel');
const { validateTicketPayload, validateStatusTransition } = require('../validators/ticketValidator');
const { formatTicketNumber, today } = require('../utils/ticketHelpers');
const AppError = require('../utils/AppError');
const pool = require('../config/db');

// ── GET /api/tickets ─────────────────────────────────────────
async function getAll(req, res, next) {
  try {
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const rows = await TicketModel.findAll({ search, status });
    res.json(rows);
  } catch (err) { next(err); }
}

// ── GET /api/tickets/:id ──────────────────────────────────────
async function getOne(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) throw new AppError('Invalid ticket ID.', 400);
    const ticket = await TicketModel.findById(id);
    if (!ticket) throw new AppError('Ticket not found.', 404);
    res.json(ticket);
  } catch (err) { next(err); }
}

// ── GET /api/tickets/track/:number (PUBLIC — no auth) ────────
// Returns only safe, customer-facing fields.
// Sensitive fields (IMEI, passcode, diagnostic_notes) are excluded.
async function trackByNumber(req, res, next) {
  try {
    const ticketNumber = (req.params.number || '').trim().toUpperCase();
    if (!ticketNumber) throw new AppError('Ticket number is required.', 400);

    const [rows] = await pool.execute(
      `SELECT
         rt.ticket_number,
         rt.status,
         rt.service_type,
         rt.problem_desc,
         rt.assigned_tech,
         rt.estimated_cost,
         rt.received_date,
         rt.completed_date,
         rt.payment_status,
         c.full_name   AS customer_name,
         c.phone       AS contact_number,
         d.device_type,
         d.brand       AS device_brand
       FROM repair_tickets rt
       LEFT JOIN customers c ON rt.customer_id = c.customer_id
       LEFT JOIN devices   d ON rt.device_id   = d.device_id
       WHERE rt.ticket_number = ?`,
      [ticketNumber]
    );

    if (!rows.length) {
      throw new AppError('No ticket found with that number. Please check and try again.', 404);
    }

    res.json({ ticket: rows[0] });
  } catch (err) { next(err); }
}

// ── GET /api/tickets/:id/logs ─────────────────────────────────
async function getLogs(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) throw new AppError('Invalid ticket ID.', 400);
    const [rows] = await pool.execute(
      `SELECT log_id, change_type, notes, changed_by, logged_at
       FROM repair_logs
       WHERE ticket_id = ?
       ORDER BY logged_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// ── POST /api/tickets ─────────────────────────────────────────
async function create(req, res, next) {
  try {
    const err = validateTicketPayload(req.body);
    if (err) throw new AppError(err, 400);

    const operator = req.headers['x-user'] ? JSON.parse(req.headers['x-user']).username : 'system';
    const receivedDate = today();

    const insertId = await TicketModel.create({ ...req.body, received_date: receivedDate });
    const ticketNumber = formatTicketNumber(insertId);
    await TicketModel.patchTicketNumber(insertId, ticketNumber);

    await pool.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Status Change', ?, ?)`,
      [insertId, `Ticket ${ticketNumber} created. Status: Pending. Problem: ${req.body.problem_desc}`, operator]
    );

    res.status(201).json({ success: true, ticket_id: insertId, ticket_number: ticketNumber, status: 'Pending' });
  } catch (err) { next(err); }
}

// ── PUT /api/tickets/:id ──────────────────────────────────────
async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) throw new AppError('Invalid ticket ID.', 400);

    const err = validateTicketPayload(req.body);
    if (err) throw new AppError(err, 400);

    const current = await TicketModel.findStatusById(id);
    if (!current) throw new AppError('Ticket not found.', 404);

    const operator = req.headers['x-user'] ? JSON.parse(req.headers['x-user']).username : 'system';
    const nextStatus = req.body.status || 'Pending';
    const isCompleting = nextStatus === 'Completed';

    const fields = {
      ...req.body,
      completed_date: isCompleting ? (req.body.completed_date || today()) : null
    };

    await TicketModel.update(id, fields);

    if (current.status !== nextStatus) {
      await pool.execute(
        `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Status Change', ?, ?)`,
        [id, `Status updated from "${current.status}" to "${nextStatus}".`, operator]
      );
    } else {
      await pool.execute(
        `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Tech Note', 'Ticket details updated.', ?)`,
        [id, operator]
      );
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── PUT /api/tickets/:id/status ───────────────────────────────
async function advanceStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { status, notes = '' } = req.body;

    if (!id) throw new AppError('Invalid ticket ID.', 400);
    if (!status) throw new AppError('Target status is required.', 400);

    const current = await TicketModel.findStatusById(id);
    if (!current) throw new AppError('Ticket not found.', 404);

    const transitionErr = validateStatusTransition(current.status, status);
    if (transitionErr) throw new AppError(transitionErr, 400);

    const operator = req.headers['x-user'] ? JSON.parse(req.headers['x-user']).username : 'system';
    const isCompleting = status === 'Completed';
    const completedDate = isCompleting ? today() : null;

    await TicketModel.updateStatus(id, status, completedDate);

    await pool.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Status Change', ?, ?)`,
      [id, `Status updated from "${current.status}" to "${status}". ${notes}`.trim(), operator]
    );

    res.json({ success: true, message: `Ticket advanced to ${status}.` });
  } catch (err) { next(err); }
}

// ── DELETE /api/tickets/:id ───────────────────────────────────
async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) throw new AppError('Invalid ticket ID.', 400);
    await TicketModel.remove(id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, trackByNumber, getLogs, create, update, advanceStatus, remove };