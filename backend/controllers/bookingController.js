// ============================================================
// controllers/bookingController.js — Booking Orchestration Logic
//
// Manages public repair intake forms and admin booking actions.
// ============================================================

const BookingModel = require('../models/bookingModel');
const AppError     = require('../utils/AppError');

// ── GET /api/bookings (Admin) ────────────────────────────────
async function getAll(req, res, next) {
  try {
    const status  = (req.query.status || '').trim();
    const records = await BookingModel.findAll({ status });
    res.json(records);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/bookings/:id ────────────────────────────────────
async function getOne(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) throw new AppError('Invalid booking ID.', 400);

    const record = await BookingModel.findById(id);
    if (!record) throw new AppError('Booking not found.', 404);

    res.json(record);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/bookings (Public Endpoint) ─────────────────────
//
// Creates a new repair intake and immediately generates a ticket.
// The ticket number (CL-YEAR-SEQUENCE) is returned so the customer
// can track their repair right away.
//
// Status split (enforced here and server-side):
//   Walk-In      → status = 'Confirmed'
//   Home Service → status = 'Pending Downpayment'
async function submitIntake(req, res, next) {
  try {
    const { customer_name, problem_desc, service_type } = req.body;

    if (!customer_name?.trim()) {
      throw new AppError('Customer name is required.', 400);
    }
    if (!problem_desc?.trim()) {
      throw new AppError('Problem description is required.', 400);
    }

    // Determine initial status based on service type
    const status = service_type === 'Home Service'
      ? 'Pending Downpayment'
      : 'Confirmed';

    // Create the booking and generate a ticket in one atomic step
    const result = await BookingModel.create({ ...req.body, status });

    // result must include: booking_id, ticket_id, ticket_number, status
    if (!result.ticket_number) {
      throw new AppError('Ticket number could not be generated. Please try again.', 500);
    }

    res.status(201).json({
      success:       true,
      booking_id:    result.booking_id,
      ticket_id:     result.ticket_id,
      ticket_number: result.ticket_number,   // ← e.g. "CL-2026-00042" — used by SuccessReceipt
      status:        result.status,
      message:       'Repair request submitted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/bookings/:id/approve (Admin) ────────────────────
async function approveBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) throw new AppError('Invalid booking ID.', 400);

    const { assigned_tech = '', estimated_cost = 0 } = req.body;

    const result = await BookingModel.convertToTicket(id, assigned_tech.trim(), estimated_cost);

    res.json({
      success:       true,
      ticket_id:     result.ticketId,
      ticket_number: result.ticketNumber,
      message:       `Booking approved and converted to ticket ${result.ticketNumber}.`,
    });
  } catch (err) {
    if (err.message.includes('already') || err.message.includes('not found')) {
      return next(new AppError(err.message, 400));
    }
    next(err);
  }
}

// ── PUT /api/bookings/:id/cancel (Admin) ─────────────────────
async function cancelBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) throw new AppError('Invalid booking ID.', 400);

    const record = await BookingModel.findById(id);
    if (!record) throw new AppError('Booking not found.', 404);

    await BookingModel.updateStatus(id, 'Cancelled');
    res.json({
      success: true,
      message: 'Booking has been cancelled.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getOne,
  submitIntake,
  approveBooking,
  cancelBooking,
};