// routes/payments.js — /api/payments
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

router.get('/summary/:ticketId', requireAuth, ctrl.getSummary);
router.get('/ticket/:ticketId', requireAuth, ctrl.getHistory);
router.post('/record', requireAuth, ctrl.processPayment);

module.exports = router;
