// controllers/photoController.js — Repair ticket documentation photos
const pool = require('../config/db');
const AppError = require('../utils/AppError');

const VALID_STAGES = ['Before', 'During', 'After'];
const MAX_PER_STAGE = 3;

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

async function getPhotos(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId || req.params.id, 10);
    if (!ticketId) throw new AppError('Invalid ticket ID.', 400);

    const [rows] = await pool.execute(
      `SELECT * FROM ticket_photos
       WHERE ticket_id = ?
       ORDER BY photo_stage ASC, uploaded_at ASC`,
      [ticketId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function addPhoto(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId || req.params.id, 10);
    const { photo_stage, file_url, caption } = req.body;
    const operator = getOperator(req);

    if (!ticketId) throw new AppError('Invalid ticket ID.', 400);
    if (!VALID_STAGES.includes(photo_stage)) {
      throw new AppError('photo_stage must be Before, During, or After.', 400);
    }
    if (!file_url || !String(file_url).trim()) {
      throw new AppError('file_url is required.', 400);
    }

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM ticket_photos WHERE ticket_id = ? AND photo_stage = ?',
      [ticketId, photo_stage]
    );
    if (countRows[0].cnt >= MAX_PER_STAGE) {
      throw new AppError(`Maximum of ${MAX_PER_STAGE} photos allowed for the ${photo_stage} stage.`, 400);
    }

    const [result] = await pool.execute(
      `INSERT INTO ticket_photos (ticket_id, photo_stage, file_url, caption, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [ticketId, photo_stage, file_url, caption || null, operator]
    );

    const logNote = `${photo_stage} repair photo added.`;
    await pool.execute(
      `INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by)
       VALUES (?, 'Photo Added', ?, ?)`,
      [ticketId, logNote, operator]
    );

    res.status(201).json({
      success: true,
      photo_id: result.insertId,
      photo_stage,
    });
  } catch (err) {
    next(err);
  }
}

async function deletePhoto(req, res, next) {
  try {
    const ticketId = parseInt(req.params.ticketId || req.params.id, 10);
    const photoId = parseInt(req.params.photoId, 10);
    if (!ticketId || !photoId) throw new AppError('Invalid ticket or photo ID.', 400);

    const [result] = await pool.execute(
      'DELETE FROM ticket_photos WHERE photo_id = ? AND ticket_id = ?',
      [photoId, ticketId]
    );
    if (!result.affectedRows) throw new AppError('Photo not found.', 404);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getPublicPhotos(req, res, next) {
  try {
    const ticketNumber = (req.params.ticketNumber || '').trim().toUpperCase();
    if (!ticketNumber) throw new AppError('Ticket number is required.', 400);

    const [tickets] = await pool.execute(
      'SELECT ticket_id FROM repair_tickets WHERE ticket_number = ? LIMIT 1',
      [ticketNumber]
    );
    if (!tickets.length) throw new AppError('Ticket not found.', 404);

    const [rows] = await pool.execute(
      `SELECT photo_id, photo_stage, file_url, caption, uploaded_at
       FROM ticket_photos
       WHERE ticket_id = ?
       ORDER BY photo_stage ASC, uploaded_at ASC`,
      [tickets[0].ticket_id]
    );

    res.json({ photos: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPhotos,
  addPhoto,
  deletePhoto,
  getPublicPhotos,
};
