'use strict';

const express = require('express');
const router  = express.Router();
const chain   = require('../blockchain/blockchain');
const { authenticate, requirePermission, requireRole } = require('../middleware/auth');
const { getAllUsers, addUser, toggleUserActive, PERMISSIONS } = require('../config/users');

// ── GET /api/blockchain/chain ─────────────────────────────────────────────────
router.get('/chain', authenticate, requirePermission('VIEW_BLOCKCHAIN'), (req, res) => {
  res.json({ success: true, length: chain.chain.length, chain: chain.chain });
});

// ── GET /api/blockchain/validate ─────────────────────────────────────────────
router.get('/validate', authenticate, requirePermission('VALIDATE_CHAIN'), (req, res) => {
  const result = chain.isChainValid();
  res.json({ success: true, ...result });
});

// ── GET /api/blockchain/block/:hash ──────────────────────────────────────────
router.get('/block/hash/:hash', authenticate, (req, res) => {
  const block = chain.getBlockByHash(req.params.hash);
  if (!block) return res.status(404).json({ error: 'Block not found' });
  res.json({ success: true, block });
});

// ── GET /api/blockchain/block/index/:index ────────────────────────────────────
router.get('/block/index/:index', authenticate, (req, res) => {
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= chain.chain.length)
    return res.status(404).json({ error: 'Invalid block index' });
  res.json({ success: true, block: chain.chain[idx] });
});

// ── GET /api/blockchain/audit ─────────────────────────────────────────────────
router.get('/audit', authenticate, requirePermission('VIEW_AUDIT_LOG'), (req, res) => {
  res.json({ success: true, log: chain.getAuditLog() });
});

// ── GET /api/blockchain/stats ─────────────────────────────────────────────────
router.get('/stats', authenticate, (req, res) => {
  res.json({ success: true, stats: chain.getStats() });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get(
  '/users',
  authenticate,
  requireRole('ADMIN'),
  requirePermission('MANAGE_USERS'),
  (req, res) => {
    res.json({ success: true, users: getAllUsers() });
  }
);

// ── POST /api/admin/users ─────────────────────────────────────────────────────
router.post(
  '/users',
  authenticate,
  requireRole('ADMIN'),
  requirePermission('MANAGE_USERS'),
  (req, res) => {
    const { username, password, role, fullName, badge } = req.body;
    if (!username || !password || !role || !fullName || !badge)
      return res.status(400).json({ error: 'All fields required: username, password, role, fullName, badge' });

    if (!PERMISSIONS[role])
      return res.status(400).json({ error: `Invalid role. Must be: ${Object.keys(PERMISSIONS).join(', ')}` });

    try {
      const user = addUser({ username, password, role, fullName, badge });
      res.status(201).json({ success: true, user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── PATCH /api/admin/users/:id/toggle ────────────────────────────────────────
router.patch(
  '/users/:id/toggle',
  authenticate,
  requireRole('ADMIN'),
  requirePermission('MANAGE_USERS'),
  (req, res) => {
    const user = toggleUserActive(req.params.id, req.body.active);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  }
);

// ── GET /api/admin/permissions ────────────────────────────────────────────────
router.get('/permissions', authenticate, requireRole('ADMIN'), (req, res) => {
  res.json({ success: true, permissions: PERMISSIONS });
});

module.exports = router;
