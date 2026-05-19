// ============================================================
// server.js — Code & Locks Express Application Entry Point
//
// Startup order:
//   1. Middleware (CORS, JSON body parser)
//   2. Route mounting (each feature domain owns its prefix)
//   3. Health check endpoint
//   4. 404 fallback
//   5. Global error handler (catches AppError + unhandled throws)
// ============================================================
const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./routes/auth');
const ticketRoutes    = require('./routes/tickets');
const bookingRoutes   = require('./routes/bookings');
const customerRoutes  = require('./routes/customers');
const inventoryRoutes = require('./routes/inventory');
const statsRoutes     = require('./routes/stats');
const paymentRoutes   = require('./routes/payments');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin:         'http://localhost:5173',
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User'],
  credentials:  true,
}));

// ── Body Parser ───────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/tickets',   ticketRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stats',     statsRoutes);
app.use('/api/payments',  paymentRoutes);

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:  'ok',
    message: 'Code & Locks API is running',
    version: '2.0.0',
  });
});

// ── 404 Fallback ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────
// Catches AppError instances (operational errors with a known status)
// and unhandled exceptions (500 server errors).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  if (status === 500) {
    console.error('[SERVER ERROR]', err);
  }

  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Code & Locks API  →  http://localhost:${PORT}`);
  console.log(`    Health check      →  http://localhost:${PORT}/api/health`);
});