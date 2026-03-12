'use strict';

const jwt = require('jsonwebtoken');
const { findById, hasPermission } = require('../config/users');

const SECRET = process.env.JWT_SECRET || 'EvidenceChain_SuperSecret_2026!@#';

// ── Generate Token ─────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, badge: user.badge },
    SECRET,
    { expiresIn: '8h', issuer: 'CustodyChain-NFSU' }
  );
}

// ── Verify Token Middleware ────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, SECRET, { issuer: 'CustodyChain-NFSU' });
    const user = findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found or deactivated' });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
  }
}

// ── Require Permission Middleware Factory ──────────────────────────────────────
function requirePermission(action) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!hasPermission(req.user.role, action)) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user.role}' cannot perform '${action}'`,
      });
    }
    next();
  };
}

// ── Require Role Middleware Factory ────────────────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Role '${req.user.role}' not allowed here` });
    }
    next();
  };
}

module.exports = { signToken, authenticate, requirePermission, requireRole };
