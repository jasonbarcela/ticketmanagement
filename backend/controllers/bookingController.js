// controllers/bookingController.js
const BookingModel = require('../models/bookingModel');
const AppError = require('../utils/AppError');
const { DOWNPAYMENT_AMOUNT, GCASH_ACCOUNT_NAME, GCASH_MOBILE } = require('../utils/homeServiceConfig');

async function getDownpaymentInfo(_req, res) {
  res.json({
    downpayment_amount: DOWNPAYMENT_AMOUNT,
    gcash_account_name: GCASH_ACCOUNT_NAME,
    gcash_mobile: GCASH_MOBILE,
    payment_method: 'GCash',
  });
}

async function getAll(req, res, next) {
  try {
    const status = (req.query.status || '').trim();
    const records = await BookingModel.findAll({ status });
    res.json(records);
  } catch (err) {
    next(err);
  }
}

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

async function submitIntake(req, res, next) {
  try {
    const body = req.body;
    const isHomeService =
      body.service_type === 'Home Service' || body.home_service === true;

    const { customer_name, problem_desc, contact_number } = body;

    if (!customer_name?.trim()) {
      throw new AppError('Customer name is required.', 400);
    }
    if (!contact_number?.trim()) {
      throw new AppError('Contact number is required.', 400);
    }
    if (!problem_desc?.trim()) {
      throw new AppError('Problem description is required.', 400);
    }

    if (isHomeService) {
      if (!body.address?.trim()) {
        throw new AppError('Service address is required for Home Service.', 400);
      }
      const ref = (body.downpayment_reference || '').trim();
      if (!ref) {
        throw new AppError('GCash payment reference number is required for Home Service.', 400);
      }
      if (ref.length < 6) {
        throw new AppError('Please enter a valid GCash reference number (at least 6 characters).', 400);
      }
    }

    const status = 'Pending';
    const payload = {
      ...body,
      service_type: isHomeService ? 'Home Service' : 'Walk-In',
      status,
      downpayment_method: isHomeService ? 'GCash' : body.downpayment_method || null,
      downpayment_reference: isHomeService ? body.downpayment_reference.trim() : null,
      downpayment_note: isHomeService
        ? `GCash ref: ${body.downpayment_reference.trim()}`
        : body.downpayment_note || null,
      service_fee: isHomeService ? DOWNPAYMENT_AMOUNT : parseFloat(body.service_fee) || 0,
    };

    const result = await BookingModel.create(payload);

    if (!result.ticket_number) {
      throw new AppError('Ticket number could not be generated. Please try again.', 500);
    }

    res.status(201).json({
      success: true,
      booking_id: result.booking_id,
      ticket_id: result.ticket_id,
      ticket_number: result.ticket_number,
      status: result.status,
      downpayment_amount: isHomeService ? DOWNPAYMENT_AMOUNT : 0,
      downpayment_reference: isHomeService ? body.downpayment_reference.trim() : null,
      message: 'Repair request submitted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

async function approveBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) throw new AppError('Invalid booking ID.', 400);
    const operator = req.headers['x-user']
      ? JSON.parse(req.headers['x-user']).username || 'admin'
      : 'system';
    const result = await BookingModel.approveBooking(id, operator);
    res.json({
      success: true,
      ticket_id: result.ticketId,
      ticket_number: result.ticketNumber,
      message: `Home service approved. Ticket ${result.ticketNumber} — assign a technician in Edit Ticket.`,
    });
  } catch (err) {
    if (err.message) return next(new AppError(err.message, 400));
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) throw new AppError('Invalid booking ID.', 400);
    const record = await BookingModel.findById(id);
    if (!record) throw new AppError('Booking not found.', 404);
    const operator = req.headers['x-user']
      ? JSON.parse(req.headers['x-user']).username || 'admin'
      : 'system';
    await BookingModel.cancelBooking(id, operator);
    res.json({ success: true, message: 'Booking has been cancelled.' });
  } catch (err) {
    if (err.message) return next(new AppError(err.message, 400));
    next(err);
  }
}

module.exports = {
  getDownpaymentInfo,
  getAll,
  getOne,
  submitIntake,
  approveBooking,
  cancelBooking,
};
