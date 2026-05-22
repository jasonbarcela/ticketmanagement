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

  // NEW: Count low stock inventory items
  const [[{ low_stock }]] = await pool.execute(
    `SELECT COUNT(*) AS low_stock FROM inventory 
     WHERE quantity <= reorder_level`
  ).catch(() => [[{ low_stock: 0 }]]);

  // NEW: Count home service bookings
  const [[{ home_service_bookings }]] = await pool.execute(
    `SELECT COUNT(*) AS home_service_bookings FROM bookings
     WHERE service_type = 'Home Service' AND status != 'Cancelled'`
  ).catch(() => [[{ home_service_bookings: 0 }]]);

  // NEW: Calculate daily revenue
  const [[dailyRevenue]] = await pool.execute(
    `SELECT COALESCE(SUM(amount_paid), 0) AS daily_revenue FROM payments
     WHERE DATE(payment_date) = CURDATE()`
  ).catch(() => [[{ daily_revenue: 0 }]]);

  return {
    total:                   parseInt(total, 10),
    pending:                 parseInt(pending, 10),
    approved:                parseInt(approved, 10),
    completed:               parseInt(completed, 10),
    home_service:            parseInt(home_service, 10),
    low_stock:               parseInt(low_stock || 0, 10),
    home_service_bookings:   parseInt(home_service_bookings || 0, 10),
    daily_revenue:           parseFloat(dailyRevenue?.daily_revenue || 0),
  };
}

module.exports = { getDashboardStats };
