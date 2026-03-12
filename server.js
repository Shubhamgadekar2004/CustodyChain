'use strict';

require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const app = express();

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ──────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max     : 20,
  message : { error: 'Too many login attempts. Try again in 15 minutes.' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max     : 200,
  message : { error: 'Too many requests.' },
});
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

// ── Static Files (public folder) ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/forms', express.static(path.join(__dirname, 'FORMS')));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/evidence',   require('./routes/evidence'));
app.use('/api/upload',     require('./routes/upload'));
app.use('/api/blockchain', require('./routes/blockchain'));
app.use('/api/admin',      require('./routes/blockchain')); // admin endpoints sit in blockchain router

// ── SPA Catch-all ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║   CustodyChain  –  running on port ${PORT}              ║`);
  console.log(`║   VETARA scoring + Anomaly detection : ACTIVE         ║`);
  console.log(`║   Login : http://localhost:${PORT}                      ║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
});

module.exports = app;
