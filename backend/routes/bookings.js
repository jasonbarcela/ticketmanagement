// routes/bookings.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');

router.get('/downpayment-info', controller.getDownpaymentInfo);
router.post('/', controller.submitIntake);

router.get('/', requireAuth, controller.getAll);
router.get('/:id', requireAuth, controller.getOne);
router.put('/:id/approve', requireAuth, controller.approveBooking);
router.put('/:id/cancel', requireAuth, controller.cancelBooking);

module.exports = router;
