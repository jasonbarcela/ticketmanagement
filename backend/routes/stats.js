// routes/stats.js — GET /api/stats
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/statsController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.getDashboard);

module.exports = router;
