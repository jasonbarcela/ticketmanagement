const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./routes/auth');
const ticketRoutes    = require('./routes/tickets');
const bookingRoutes   = require('./routes/bookings');
const customerRoutes  = require('./routes/customers');
const inventoryRoutes = require('./routes/inventory');
const statsRoutes     = require('./routes/stats');
const paymentRoutes   = require('./routes/payments');
const staffRoutes     = require('./routes/staff');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin:         process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User'],
  credentials:    true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

app.use('/api/auth',      authRoutes);
app.use('/api/tickets',   ticketRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stats',     statsRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/staff',     staffRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status:  'ok',
    message: 'Code & Locks API is running',
    version: '2.0.0',
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  if (status === 500) {
    console.error('[SERVER ERROR]', err);
  }

  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`✅  Code & Locks API  →  http://localhost:${PORT}`);
  console.log(`    Health check      →  http://localhost:${PORT}/api/health`);
});