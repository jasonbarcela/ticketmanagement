// models/statsModel.js — Dashboard KPI aggregates
const pool = require('../config/db');

async function getDashboardStats() {
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM repair_tickets WHERE status != 'Cancelled'"
  );
  const [[{ pending }]] = await pool.execute(
    "SELECT COUNT(*) AS pending FROM repair_tickets WHERE status = 'Pending'"
  );
  const [[{ approved }]] = await pool.execute(
    `SELECT COUNT(*) AS approved FROM repair_tickets
     WHERE status != 'Cancelled'
       AND (
         (service_type = 'Home Service' AND status IN ('Approved', 'On The Way'))
         OR (service_type = 'Walk-In' AND status IN ('Diagnosing', 'Repairing', 'Ready for Pickup'))
       )`
  );
  const [[{ completed }]] = await pool.execute(
    "SELECT COUNT(*) AS completed FROM repair_tickets WHERE status = 'Completed'"
  );
  const [[{ home_service }]] = await pool.execute(
    `SELECT COUNT(*) AS home_service FROM repair_tickets
     WHERE service_type = 'Home Service' AND status != 'Cancelled'`
  );

  return {
    total:        parseInt(total, 10),
    pending:      parseInt(pending, 10),
    approved:     parseInt(approved, 10),
    completed:    parseInt(completed, 10),
    home_service: parseInt(home_service, 10),
  };
}

module.exports = { getDashboardStats };
