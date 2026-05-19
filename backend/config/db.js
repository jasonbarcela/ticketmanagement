// ============================================================
// config/db.js — MySQL Connection Pool
//
// Uses mysql2/promise for async/await support throughout the
// controller layer. Pool settings are appropriate for a
// single-instance local repair shop prototype.
//
// To configure for your environment, update the values below
// or move them to a .env file and use process.env.DB_*.
// ============================================================
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'code_and_locks',
  charset:          'utf8mb4',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
});

module.exports = pool;
