// routes/tickets.js — /api/tickets
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/ticketController');
const { requireAuth, requireRole } = require('../middleware/auth');

// ── PUBLIC — no auth required ─────────────────────────────────
// IMPORTANT: must be declared BEFORE /:id so Express doesn't
// treat "track" as a numeric ticket ID.
router.get('/track/lookup', ctrl.trackLookup);
router.get('/track/:number', ctrl.trackByNumber);

// ── Protected — staff/admin only ──────────────────────────────
router.get('/',              requireAuth, ctrl.getAll);
router.get('/:id',           requireAuth, ctrl.getOne);
router.get('/:id/logs',      requireAuth, ctrl.getLogs);
router.post('/',             requireAuth, ctrl.create);
router.put('/:id',           requireAuth, ctrl.update);
router.put('/:id/status',    requireAuth, ctrl.advanceStatus);
router.delete('/:id',        requireAuth, ctrl.remove);

module.exports = router;