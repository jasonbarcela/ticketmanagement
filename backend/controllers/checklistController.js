const pool = require('../config/db');
const AppError = require('../utils/AppError');

function getOperator(req) {
  if (req.headers['x-user']) {
    try {
      const u = JSON.parse(req.headers['x-user']);
      return u.full_name || u.username || 'system';
    } catch {
      return 'system';
    }
  }
  return 'system';
}

async function getChecklist(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId || req.params.id, 10);
    if (!ticketId) throw new AppError('Invalid ticket ID.', 400);

    const [rows] = await pool.execute(
      `SELECT * FROM ticket_checklist
       WHERE ticket_id = ? AND checklist_type = 'Problem'
       ORDER BY sort_order ASC, item_id ASC`,
      [ticketId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId || req.params.id, 10);
    const label = (req.body.label || '').trim();

    if (!ticketId) throw new AppError('Invalid ticket ID.', 400);
    if (!label) throw new AppError('Checklist label is required.', 400);

    const [maxRow] = await pool.execute(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_sort
       FROM ticket_checklist WHERE ticket_id = ? AND checklist_type = 'Problem'`,
      [ticketId]
    );
    const sortOrder = (maxRow[0]?.max_sort || 0) + 1;

    const [result] = await pool.execute(
      `INSERT INTO ticket_checklist (ticket_id, label, sort_order, checklist_type)
       VALUES (?, ?, ?, 'Problem')`,
      [ticketId, label, sortOrder]
    );

    res.status(201).json({
      success: true,
      item_id: result.insertId,
      label,
      checklist_type: 'Problem',
      sort_order: sortOrder,
    });
  } catch (err) {
    next(err);
  }
}

async function toggleItem(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId || req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const isChecked = req.body.is_checked ? 1 : 0;
    const operator = getOperator(req);

    if (!ticketId || !itemId) throw new AppError('Invalid ticket or item ID.', 400);

    const [items] = await pool.execute(
      `SELECT label, is_checked FROM ticket_checklist
       WHERE item_id = ? AND ticket_id = ? AND checklist_type = 'Problem'`,
      [itemId, ticketId]
    );
    if (!items.length) throw new AppError('Checklist item not found.', 404);

    const label = items[0].label;
    const checkedBy = isChecked ? operator : null;
    const checkedAt = isChecked ? new Date() : null;

    await pool.execute(
      `UPDATE ticket_checklist
       SET is_checked = ?, checked_by = ?, checked_at = ?
       WHERE item_id = ? AND ticket_id = ?`,
      [isChecked, checkedBy, checkedAt, itemId, ticketId]
    );

    const action = isChecked ? 'confirmed' : 'unconfirmed';
    const logNote = `Problem "${label}" ${action} by ${operator}.`;
    await pool.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by)
       VALUES (?, 'Checklist Update', ?, ?)`,
      [ticketId, logNote, operator]
    );

    res.json({ success: true, is_checked: !!isChecked });
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId || req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (!ticketId || !itemId) throw new AppError('Invalid ticket or item ID.', 400);

    const [result] = await pool.execute(
      `DELETE FROM ticket_checklist
       WHERE item_id = ? AND ticket_id = ? AND checklist_type = 'Problem'`,
      [itemId, ticketId]
    );
    if (!result.affectedRows) throw new AppError('Checklist item not found.', 404);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getChecklist,
  addItem,
  toggleItem,
  deleteItem,
};