// ============================================================
// models/statsModel.js — Operational KPI Aggregate Queries
// ============================================================
const pool = require('../config/db');

async function getDashboardStats() {
  const [[{ total }]]       = await pool.execute("SELECT COUNT(*) AS total FROM repair_tickets");
  const [[{ pending_dp }]]  = await pool.execute("SELECT COUNT(*) AS pending_dp FROM repair_tickets WHERE status = 'Pending Downpayment'");
  const [[{ confirmed }]]   = await pool.execute("SELECT COUNT(*) AS confirmed FROM repair_tickets WHERE status = 'Confirmed'");
  const [[{ in_progress }]] = await pool.execute("SELECT COUNT(*) AS in_progress FROM repair_tickets WHERE status = 'In Progress'");
  const [[{ completed }]]   = await pool.execute("SELECT COUNT(*) AS completed FROM repair_tickets WHERE status = 'Completed'");
  const [[{ customers }]]   = await pool.execute("SELECT COUNT(*) AS customers FROM customers");

  return {
    total:       parseInt(total),
    pending_dp:  parseInt(pending_dp),
    confirmed:   parseInt(confirmed),
    in_progress: parseInt(in_progress),
    completed:   parseInt(completed),
    customers:   parseInt(customers),
  };
}

module.exports = { getDashboardStats };
