// ============================================================
// controllers/statsController.js — Dashboard KPI Aggregates
// ============================================================
const StatsModel = require('../models/statsModel');

async function getDashboard(_req, res, next) {
  try {
    const stats = await StatsModel.getDashboardStats();
    res.json(stats);
  } catch (err) { next(err); }
}

module.exports = { getDashboard };
