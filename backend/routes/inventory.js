// routes/inventory.js — /api/inventory
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/inventoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Read-only: all authenticated roles
router.get('/', requireAuth, ctrl.getAll);

// Admin-only write operations
router.post('/update', requireAuth, requireRole(['admin']), ctrl.adjustStock);
router.post('/add',    requireAuth, requireRole(['admin']), ctrl.addPart);

module.exports = router;
