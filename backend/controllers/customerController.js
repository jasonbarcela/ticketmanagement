// ============================================================
// controllers/customerController.js — Customer Profiles Engine
// ============================================================
const CustomerModel = require('../models/customerModel');
const AppError = require('../utils/AppError');

// ── GET /api/customers ───────────────────────────────────────
async function getAll(req, res, next) {
  try {
    const search = (req.query.search || '').trim();
    const customers = await CustomerModel.findAll({ search });
    res.json(customers);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/customers/:id/profile ───────────────────────────
async function getProfile(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) throw new AppError('Invalid or missing customer reference ID.', 400);

    const profile = await CustomerModel.findProfileById(id);
    if (!profile) throw new AppError('Customer profile record not found.', 404);

    res.json(profile);
  } catch (err) {
    next(err);
  }
}

// CRITICAL: Ensure these names match what the router imports exactly!
module.exports = {
  getAll,
  getProfile
};