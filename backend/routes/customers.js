// ============================================================
// routes/customers.js — Customer Directory Maps
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('../controllers/customerController');

// Ensure these functions exist in your controller file:
router.get('/', controller.getAll);
router.get('/:id/profile', controller.getProfile);

module.exports = router;