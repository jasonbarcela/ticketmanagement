// routes/inventory.js — /api/inventory
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const repairCtrl = require('../controllers/repairController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.getAll);
router.post('/update', requireAuth, requireRole(['admin']), ctrl.adjustStock);
router.post('/add', requireAuth, requireRole(['admin']), ctrl.addPart);

// Ticket parts workflow (admin + technician) — before /:partId
router.get('/ticket/:ticketId', requireAuth, repairCtrl.getTicketParts);
router.post('/ticket/attach', requireAuth, repairCtrl.attachPart);
router.delete('/ticket/:ticketId/detach/:partId', requireAuth, repairCtrl.detachPart);
router.get('/low-stock', requireAuth, repairCtrl.getLowStock);

router.patch('/:partId', requireAuth, requireRole(['admin']), ctrl.editPart);
router.delete('/:partId', requireAuth, requireRole(['admin']), ctrl.deletePart);

module.exports = router;
