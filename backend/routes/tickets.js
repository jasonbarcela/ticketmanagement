// routes/tickets.js — /api/tickets
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/ticketController');
const checklistCtrl = require('../controllers/checklistController');
const photoCtrl  = require('../controllers/photoController');
const { requireAuth, requireRole } = require('../middleware/auth');

// ── PUBLIC — no auth required ─────────────────────────────────
// IMPORTANT: specific /track/* routes before /track/:number
router.get('/track/lookup', ctrl.trackLookup);
router.get('/track/parts/:ticketNumber', ctrl.getPublicTicketParts);
router.get('/track/checklist/:ticketNumber', ctrl.getPublicChecklist);
router.get('/track/photos/:ticketNumber', photoCtrl.getPublicPhotos);
router.get('/track/:number', ctrl.trackByNumber);

// ── Protected — staff/admin only ──────────────────────────────
router.get('/',              requireAuth, ctrl.getAll);
router.get('/:id/logs',      requireAuth, ctrl.getLogs);

// Checklist (authenticated)
router.get('/:id/checklist', requireAuth, checklistCtrl.getChecklist);
router.post('/:id/checklist', requireAuth, checklistCtrl.addItem);
router.patch('/:id/checklist/:itemId', requireAuth, checklistCtrl.toggleItem);
router.delete('/:id/checklist/:itemId', requireAuth, requireRole(['admin']), checklistCtrl.deleteItem);

// Photos (authenticated)
router.get('/:id/photos', requireAuth, photoCtrl.getPhotos);
router.post('/:id/photos', requireAuth, photoCtrl.addPhoto);
router.delete('/:id/photos/:photoId', requireAuth, photoCtrl.deletePhoto);

router.get('/:id',           requireAuth, ctrl.getOne);
router.post('/',             requireAuth, ctrl.create);
router.put('/:id',           requireAuth, ctrl.update);
router.put('/:id/status',    requireAuth, ctrl.advanceStatus);
router.delete('/:id',        requireAuth, ctrl.remove);

module.exports = router;
