// routes/staff.js — /api/staff
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/staffController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/technicians', requireAuth, requireRole(['admin']), ctrl.createTechnician);
router.get('/technicians', requireAuth, requireRole(['admin']), ctrl.listTechnicians);
router.get('/technicians/:username', requireAuth, ctrl.getTechnicianProfile);

module.exports = router;
