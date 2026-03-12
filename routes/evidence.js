'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto  = require('crypto');
const router  = express.Router();
const chain   = require('../blockchain/blockchain');
const { authenticate, requirePermission } = require('../middleware/auth');

// Helper: SHA-256 fingerprint of form data
function fingerprint(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ── POST /api/evidence/submit ──────────────────────────────────────────────────
router.post(
  '/submit',
  authenticate,
  requirePermission('SUBMIT_EVIDENCE'),
  (req, res) => {
    try {
      const { type, caseNumber, exhibitMarkedAs, formData } = req.body;

      const VALID_TYPES = [
        'PHONE_TAB_IPAD',
        'DESKTOP_LAPTOP_SERVER',
        'EXTERNAL_STORAGE',
        'IMAGE_FILE',
        'AUDIO_FILE',
        'LOG_FILE',
        'VIDEO_FILE',
        'FORENSIC_REPORT',
      ];
      if (!VALID_TYPES.includes(type))
        return res.status(400).json({ error: `Invalid evidence type. Must be one of: ${VALID_TYPES.join(', ')}` });

      if (!caseNumber || !exhibitMarkedAs || !formData)
        return res.status(400).json({ error: 'caseNumber, exhibitMarkedAs, and formData are required' });

      const exhibitId   = `EX-${uuidv4().split('-')[0].toUpperCase()}`;
      const dataHash    = fingerprint(formData);
      const submittedAt = new Date().toISOString();

      const evidenceData = {
        type,
        caseNumber,
        exhibitMarkedAs,
        exhibitId,
        formData,
        dataHash,
        submittedBy : req.user.username,
        submittedByRole: req.user.role,
        submittedByBadge: req.user.badge,
        submittedAt,
        ipAddress   : req.ip,
        status      : 'SUBMITTED',
      };

      const block = chain.addEvidenceBlock(evidenceData, req.user.username);

      // First custody entry
      block.addTransaction({
        action : 'INITIAL_SUBMISSION',
        actor  : req.user.username,
        role   : req.user.role,
        badge  : req.user.badge,
        note   : 'Evidence submitted and registered on blockchain',
      });
      // Persist after tx update
      chain._persist();

      res.status(201).json({
        success      : true,
        message      : 'Evidence registered on CustodyChain blockchain',
        exhibitId,
        blockIndex   : block.index,
        blockId      : block.blockId,
        blockHash    : block.hash,
        dataHash,
        submittedAt,
        vetaraScore  : block.vetaraScore,
        anomalyFlags : block.anomalyFlags,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/evidence/all ──────────────────────────────────────────────────────
router.get(
  '/all',
  authenticate,
  requirePermission('VIEW_ALL_EVIDENCE'),
  (req, res) => {
    const blocks = chain.chain.slice(1); // exclude genesis
    res.json({ success: true, count: blocks.length, evidence: blocks });
  }
);

// ── GET /api/evidence/my ───────────────────────────────────────────────────────
router.get('/my', authenticate, (req, res) => {
  const blocks = chain.chain
    .slice(1)
    .filter(b => b.evidenceData.submittedBy === req.user.username);
  res.json({ success: true, count: blocks.length, evidence: blocks });
});

// ── GET /api/evidence/case/:caseNumber ────────────────────────────────────────
router.get('/case/:caseNumber', authenticate, (req, res) => {
  const role = req.user.role;
  const blocks = chain.getBlockByCaseNumber(req.params.caseNumber);

  // IOs can only see their own cases
  const filtered =
    role === 'IO'
      ? blocks.filter(b => b.evidenceData.submittedBy === req.user.username)
      : blocks;

  res.json({ success: true, count: filtered.length, evidence: filtered });
});

// ── GET /api/evidence/exhibit/:exhibitId ──────────────────────────────────────
router.get('/exhibit/:exhibitId', authenticate, (req, res) => {
  const block = chain.getBlockByExhibit(req.params.exhibitId);
  if (!block) return res.status(404).json({ error: 'Exhibit not found' });
  res.json({ success: true, block });
});

// ── POST /api/evidence/approve/:blockId ───────────────────────────────────────
router.post(
  '/approve/:blockId',
  authenticate,
  requirePermission('APPROVE_EVIDENCE'),
  (req, res) => {
    try {
      const block = chain.chain.find(b => b.blockId === req.params.blockId);
      if (!block) return res.status(404).json({ error: 'Block not found' });

      block.evidenceData.status   = 'APPROVED';
      block.evidenceData.approvedBy = req.user.username;
      block.evidenceData.approvedAt = new Date().toISOString();

      chain.addCustodyTransaction(req.params.blockId, {
        action: 'APPROVED',
        actor : req.user.username,
        role  : req.user.role,
        note  : req.body.note || 'Evidence approved',
      });

      res.json({ success: true, message: 'Evidence approved', blockId: block.blockId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/evidence/sign/:blockId ─────────────────────────────────────────
router.post(
  '/sign/:blockId',
  authenticate,
  requirePermission('SIGN_EVIDENCE'),
  (req, res) => {
    try {
      const block = chain.chain.find(b => b.blockId === req.params.blockId);
      if (!block) return res.status(404).json({ error: 'Block not found' });

      const sigHash = crypto
        .createHash('sha256')
        .update(`${block.hash}${req.user.username}${Date.now()}`)
        .digest('hex');

      block.evidenceData.forensicSignature   = sigHash;
      block.evidenceData.signedBy            = req.user.username;
      block.evidenceData.signedAt            = new Date().toISOString();
      block.evidenceData.forensicNotes       = req.body.notes || '';

      chain.addCustodyTransaction(req.params.blockId, {
        action : 'FORENSIC_SIGNED',
        actor  : req.user.username,
        role   : req.user.role,
        sigHash,
        notes  : req.body.notes || '',
      });

      res.json({ success: true, sigHash, blockId: block.blockId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/evidence/custody/:blockId ───────────────────────────────────────
router.post(
  '/custody/:blockId',
  authenticate,
  requirePermission('CHAIN_OF_CUSTODY'),
  (req, res) => {
    try {
      const { action, note } = req.body;
      const block = chain.addCustodyTransaction(req.params.blockId, {
        action : action || 'TRANSFER',
        actor  : req.user.username,
        role   : req.user.role,
        badge  : req.user.badge,
        note   : note || '',
      });
      res.json({ success: true, blockId: block.blockId, transactions: block.transactions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/evidence/stats ───────────────────────────────────────────────────
router.get('/stats', authenticate, (req, res) => {
  res.json({ success: true, stats: chain.getStats() });
});

module.exports = router;
