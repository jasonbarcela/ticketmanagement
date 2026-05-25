// ============================================================
// controllers/ticketController.js
// ============================================================
const TicketModel = require('../models/ticketModel');
const BookingModel = require('../models/bookingModel');
const InvModel = require('../models/inventoryModel');
const {
  validateTicketPayload,
  validateStatusTransition,
  validateHomeServiceTech,
} = require('../validators/ticketValidator');
const {
  isHomeService,
  normalizeHomeServiceStatus,
  statusLogMessage,
} = require('../utils/homeServiceStatuses');
const { formatTicketNumber, getInitialStatus, today } = require('../utils/ticketHelpers');
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

const TRACK_SELECT = `
  SELECT
    rt.ticket_id,
    rt.ticket_number,
    rt.status,
    rt.service_type,
    rt.problem_desc,
    rt.preferred_schedule,
    rt.service_date,
    rt.preferred_time,
    rt.assigned_tech,
    rt.tech_contact,
    rt.tech_assigned_date,
    rt.estimated_cost,
    rt.repair_notes,
    rt.diagnostic_notes,
    rt.additional_findings,
    rt.received_date,
    rt.completed_date,
    rt.payment_status,
    c.full_name AS customer_name,
    c.phone     AS contact_number,
    d.device_type,
    d.brand     AS device_brand
  FROM repair_tickets rt
  LEFT JOIN customers c ON rt.customer_id = c.customer_id
  LEFT JOIN devices d ON rt.device_id = d.device_id
`;

function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function fetchTrackLogs(ticketId) {
  const [logs] = await pool.execute(
    `SELECT change_type, notes, logged_at
     FROM repair_logs
     WHERE ticket_id = ?
       AND change_type IN ('Status Change', 'Customer Update', 'Tech Note', 'Checklist Update', 'Photo Added')
     ORDER BY logged_at ASC
     LIMIT 30`,
    [ticketId]
  );
  return logs;
}

function sendTrackResponse(res, row) {
  const ticket = { ...row };
  const ticketId = ticket.ticket_id;
  delete ticket.ticket_id;
  return fetchTrackLogs(ticketId).then((logs) => {
    res.json({ ticket, logs });
  });
}

// ── GET /api/tickets/track/lookup?ticket=&contact= (PUBLIC) ───
async function trackLookup(req, res, next) {
  try {
    const ticketNumber = (req.query.ticket || '').trim().toUpperCase();
    const contactDigits = normalizePhoneDigits(req.query.contact);

    if (!ticketNumber && contactDigits.length < 7) {
      throw new AppError('Enter a ticket number or a valid contact number.', 400);
    }

    let rows;
    if (ticketNumber) {
      [rows] = await pool.execute(
        `${TRACK_SELECT} WHERE rt.ticket_number = ? LIMIT 1`,
        [ticketNumber]
      );
      if (!rows.length) {
        throw new AppError('No ticket found with that number. Please check and try again.', 404);
      }
    } else {
      [rows] = await pool.execute(
        `${TRACK_SELECT}
         LEFT JOIN bookings b ON rt.booking_id = b.booking_id
         WHERE (
           REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '+', '') LIKE ?
           OR REPLACE(REPLACE(REPLACE(b.contact_number, ' ', ''), '-', ''), '+', '') LIKE ?
         )
         ORDER BY rt.created_at DESC
         LIMIT 1`,
        [`%${contactDigits}%`, `%${contactDigits}%`]
      );
      if (!rows.length) {
        throw new AppError('No repair found for that contact number.', 404);
      }
    }

    await sendTrackResponse(res, rows[0]);
  } catch (err) { next(err); }
}

// ── GET /api/tickets/track/:number (PUBLIC — legacy URL) ─────
async function trackByNumber(req, res, next) {
  try {
    const ticketNumber = (req.params.number || '').trim().toUpperCase();
    if (!ticketNumber) throw new AppError('Ticket number is required.', 400);

    const [rows] = await pool.execute(
      `${TRACK_SELECT} WHERE rt.ticket_number = ? LIMIT 1`,
      [ticketNumber]
    );

    if (!rows.length) {
      throw new AppError('No ticket found with that number. Please check and try again.', 404);
    }

    await sendTrackResponse(res, rows[0]);
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

    const initialStatus = req.body.status || getInitialStatus(req.body.service_type);
    const insertId = await TicketModel.create({
      ...req.body,
      status: initialStatus,
      received_date: receivedDate,
    });
    const ticketNumber = formatTicketNumber(insertId);
    await TicketModel.patchTicketNumber(insertId, ticketNumber);

    await pool.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Status Change', ?, ?)`,
      [insertId, `Ticket ${ticketNumber} created. Status: ${initialStatus}.`, operator]
    );

    res.status(201).json({ success: true, ticket_id: insertId, ticket_number: ticketNumber, status: initialStatus });
  } catch (err) { next(err); }
}

// ── PUT /api/tickets/:id ──────────────────────────────────────
async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) throw new AppError('Invalid ticket ID.', 400);

    const current = await TicketModel.findStatusById(id);
    if (!current) throw new AppError('Ticket not found.', 404);

    const serviceType = req.body.service_type || current.service_type || 'Walk-In';
    const currentStatus = isHomeService(serviceType)
      ? normalizeHomeServiceStatus(current.status)
      : current.status;
    const bodyStatus = req.body.status != null ? String(req.body.status).trim() : '';
    let nextStatus = bodyStatus
      ? (isHomeService(serviceType)
        ? normalizeHomeServiceStatus(bodyStatus)
        : bodyStatus)
      : currentStatus;

    const payload = { ...req.body, service_type: serviceType, status: nextStatus };
    const err = validateTicketPayload(payload);
    if (err) throw new AppError(err, 400);

    if (!nextStatus || !String(nextStatus).trim()) {
      throw new AppError('Ticket status is required.', 400);
    }

    const transitionErr = validateStatusTransition(serviceType, currentStatus, nextStatus);
    if (transitionErr) throw new AppError(transitionErr, 400);

    const techErr = validateHomeServiceTech(
      serviceType,
      nextStatus,
      req.body.assigned_tech,
      current.assigned_tech
    );
    if (techErr) throw new AppError(techErr, 400);

    const operator = req.headers['x-user'] ? JSON.parse(req.headers['x-user']).username : 'system';
    const isCompleting = nextStatus === 'Completed';

    const nextTech = (req.body.assigned_tech || '').trim();
    const prevTech = (current.assigned_tech || '').trim();
    const techNewlyAssigned = nextTech && nextTech !== prevTech;

    let techAssignedDate = req.body.tech_assigned_date || current.tech_assigned_date;
    if (techNewlyAssigned && isHomeService(serviceType)) {
      techAssignedDate = techAssignedDate || today();
    }
    if (techAssignedDate === '') techAssignedDate = null;

    const [prevNoteRows] = await pool.execute(
      'SELECT repair_notes FROM repair_tickets WHERE ticket_id = ?',
      [id]
    );
    const prevRepairNotes = (prevNoteRows[0]?.repair_notes || '').trim();
    const nextRepairNotes = req.body.repair_notes != null
      ? String(req.body.repair_notes).trim()
      : prevRepairNotes;

    const fields = {
      ...req.body,
      service_type: serviceType,
      status: nextStatus,
      tech_assigned_date: techAssignedDate,
      completed_date: isCompleting ? (req.body.completed_date || today()) : null,
      repair_notes: req.body.repair_notes != null ? req.body.repair_notes : prevNoteRows[0]?.repair_notes,
    };

    await TicketModel.update(id, fields);

    if (isHomeService(serviceType)) {
      await BookingModel.syncBookingFromTicket(id, nextStatus);
    }

    if (nextRepairNotes && nextRepairNotes !== prevRepairNotes) {
      await pool.execute(
        `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Tech Note', ?, ?)`,
        [id, nextRepairNotes, operator]
      );
    }

    if (currentStatus !== nextStatus) {
      const logNote = isHomeService(serviceType)
        ? statusLogMessage(nextStatus)
        : `Status updated from "${currentStatus}" to "${nextStatus}".`;
      await pool.execute(
        `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Status Change', ?, ?)`,
        [id, logNote, operator]
      );
    } else if (techNewlyAssigned && isHomeService(serviceType)) {
      await pool.execute(
        `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Status Change', ?, ?)`,
        [id, statusLogMessage(nextStatus, { techAssigned: true }), operator]
      );
    } else if (nextRepairNotes === prevRepairNotes) {
      await pool.execute(
        `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Tech Note', 'Ticket details updated.', ?)`,
        [id, operator]
      );
    }

    res.json({ success: true, status: nextStatus });
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

    const serviceType = current.service_type || 'Walk-In';
    const nextStatus = isHomeService(serviceType)
      ? normalizeHomeServiceStatus(status)
      : status;

    const currentStatus = isHomeService(serviceType)
      ? normalizeHomeServiceStatus(current.status)
      : current.status;
    const transitionErr = validateStatusTransition(serviceType, currentStatus, nextStatus);
    if (transitionErr) throw new AppError(transitionErr, 400);

    const operator = req.headers['x-user'] ? JSON.parse(req.headers['x-user']).username : 'system';
    const isCompleting = nextStatus === 'Completed';
    const completedDate = isCompleting ? today() : null;

    await TicketModel.updateStatus(id, nextStatus, completedDate);

    if (isHomeService(serviceType)) {
      await BookingModel.syncBookingFromTicket(id, nextStatus);
    }

    const logNote = isHomeService(serviceType)
      ? statusLogMessage(nextStatus)
      : `Status updated from "${current.status}" to "${nextStatus}". ${notes}`.trim();

    await pool.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES (?, 'Status Change', ?, ?)`,
      [id, logNote, operator]
    );

    res.json({ success: true, message: `Ticket advanced to ${nextStatus}.` });
  } catch (err) { next(err); }
}

const PUBLIC_PARTS_STATUSES = new Set([
  'Diagnosing', 'Repairing', 'Ready for Pickup', 'Completed',
]);

// ── GET /api/tickets/track/parts/:ticketNumber (PUBLIC) ───────
async function getPublicTicketParts(req, res, next) {
  try {
    const ticketNumber = (req.params.ticketNumber || '').trim().toUpperCase();
    if (!ticketNumber) throw new AppError('Ticket number is required.', 400);

    const [rows] = await pool.execute(
      'SELECT ticket_id, status FROM repair_tickets WHERE ticket_number = ? LIMIT 1',
      [ticketNumber]
    );
    if (!rows.length) throw new AppError('Ticket not found.', 404);

    const { ticket_id: ticketId, status } = rows[0];

    if (!PUBLIC_PARTS_STATUSES.has(status)) {
      return res.json({ visible: false, parts: [] });
    }

    const rawParts = await InvModel.findPartsByTicketId(ticketId);
    const parts = rawParts.map(p => {
      const unitPrice = parseFloat(p.unit_price) || 0;
      const qty = parseInt(p.quantity, 10) || 0;
      const customerProvided = !!p.customer_provided;
      return {
        part_name: p.part_name,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: customerProvided ? 0 : unitPrice * qty,
        customer_provided: customerProvided,
      };
    });

    res.json({ visible: true, parts });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/tickets/track/checklist/:ticketNumber (PUBLIC) ───
async function getPublicChecklist(req, res, next) {
  try {
    const ticketNumber = (req.params.ticketNumber || '').trim().toUpperCase();
    if (!ticketNumber) throw new AppError('Ticket number is required.', 400);

    const [tickets] = await pool.execute(
      'SELECT ticket_id FROM repair_tickets WHERE ticket_number = ? LIMIT 1',
      [ticketNumber]
    );
    if (!tickets.length) throw new AppError('Ticket not found.', 404);

    const ticketId = tickets[0].ticket_id;
    const [problems] = await pool.execute(
      `SELECT label, is_checked, checked_at
       FROM ticket_checklist
       WHERE ticket_id = ? AND checklist_type = 'Problem'
       ORDER BY sort_order ASC, item_id ASC`,
      [ticketId]
    );
    const [repairSteps] = await pool.execute(
      `SELECT label, is_checked, checked_at
       FROM ticket_checklist
       WHERE ticket_id = ? AND checklist_type = 'Repair'
       ORDER BY sort_order ASC, item_id ASC`,
      [ticketId]
    );

    res.json({ problems, repair_steps: repairSteps, items: [...problems, ...repairSteps] });
  } catch (err) {
    next(err);
  }
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

module.exports = {
  getAll,
  getOne,
  trackLookup,
  trackByNumber,
  getPublicTicketParts,
  getPublicChecklist,
  getLogs,
  create,
  update,
  advanceStatus,
  remove,
};