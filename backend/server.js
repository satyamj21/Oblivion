require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cron = require('node-cron');

const apiRoutes = require('./routes/apis');
const scanRoutes = require('./routes/scan');
const securityRoutes = require('./routes/security');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const alertRoutes = require('./routes/alerts');

const { runScheduledScan } = require('./services/scannerService');

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/apis',      apiRoutes);
app.use('/api/scan',      scanRoutes);
app.use('/api/security',  securityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts',    alertRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ─── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ─── Database + Server ───────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zombieguard';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 ZombieGuard backend running on port ${PORT}`);
    });

    // ─── Scheduled scan every 6 hours ────────────────────────
    cron.schedule('0 */6 * * *', () => {
      console.log('⏰ Running scheduled API scan...');
      runScheduledScan();
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
