// ============================================================
// routes/bookings.js — Bookings Architecture Endpoint Paths
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('../controllers/bookingController');

// Admin-facing dashboard endpoints
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.put('/:id/approve', controller.approveBooking);
router.put('/:id/cancel', controller.cancelBooking);

// Unauthenticated public facing intake form routing endpoint
router.post('/', controller.submitIntake);

module.exports = router;