'use strict';

/**
 * CustodyChain Blockchain Engine
 *
 * Implements a purpose-built, single-node blockchain for law-enforcement
 * digital evidence management.  Key original contributions:
 *
 *   VETARA Score  – Verified Evidence Trust And Risk Assessment
 *                   A per-block 0-100 integrity rating computed from five
 *                   weighted factors (chain continuity, custody depth,
 *                   forensic sign-off, time-gap anomaly, role fitness).
 *
 *   Anomaly Detector – Flags evidence submissions that deviate from expected
 *                      behavioural patterns (off-hours, rapid bursts, etc.).
 *
 * Author : Shubham Gadekar
 * Institute: National Forensic Sciences University, Goa Campus (NFSU Goa)
 * Project : CustodyChain — Hackathon 2026
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
//  VETARA SCORING ENGINE  (original algorithm)
// ─────────────────────────────────────────────
/**
 * computeVETARA(block, previousBlock, chainCtx)
 *
 * Returns an integer 0-100 representing how trustworthy this evidence block
 * is.  Designed to be deterministic: given the same inputs the score is
 * always identical, making it reproducible in court.
 *
 * Factor breakdown (total 100 pts):
 *   A. Chain continuity     – 30 pts (hash linkage intact?)
 *   B. Custody depth        – 20 pts (≥3 events = full marks, scaled below)
 *   C. Forensic signature   – 20 pts (expert sign-off present?)
 *   D. Time-gap penalty     – 15 pts (deducted if gap > 72 h to prev block)
 *   E. Role appropriateness – 15 pts (officer role matches evidence category)
 */
function computeVETARA(block, previousBlock) {
  let score = 0;

  // ── A. Chain continuity (30 pts) ───────────
  if (previousBlock && block.previousHash === previousBlock.hash) score += 30;

  // ── B. Custody depth (20 pts) ──────────────
  const custodyDepth = Array.isArray(block.transactions) ? block.transactions.length : 0;
  score += Math.min(20, Math.round((custodyDepth / 3) * 20));

  // ── C. Forensic signature (20 pts) ─────────
  if (block.evidenceData && block.evidenceData.forensicSignature) score += 20;

  // ── D. Time-gap penalty (up to 15 pts) ─────
  if (previousBlock) {
    const msGap   = new Date(block.timestamp) - new Date(previousBlock.timestamp);
    const hoursGap = msGap / (1000 * 60 * 60);
    // Full marks if gap ≤ 72 h; linear deduction after that, min 0
    score += Math.max(0, Math.round(15 - Math.max(0, hoursGap - 72) * 0.5));
  } else {
    score += 15; // genesis or first block — no penalty
  }

  // ── E. Role appropriateness (15 pts) ───────
  const ROLE_MAP = {
    PHONE_TAB_IPAD       : ['IO', 'FORENSIC_EXPERT', 'ADMIN'],
    DESKTOP_LAPTOP_SERVER: ['IO', 'FORENSIC_EXPERT', 'ADMIN'],
    EXTERNAL_STORAGE     : ['IO', 'FORENSIC_EXPERT', 'ADMIN'],
    IMAGE_FILE           : ['IO', 'FORENSIC_EXPERT', 'ADMIN'],
    AUDIO_FILE           : ['IO', 'FORENSIC_EXPERT', 'ADMIN'],
    VIDEO_FILE           : ['IO', 'FORENSIC_EXPERT', 'ADMIN'],
    LOG_FILE             : ['FORENSIC_EXPERT', 'ADMIN'],
    FORENSIC_REPORT      : ['FORENSIC_EXPERT', 'ADMIN'],
  };
  const expectedRoles = ROLE_MAP[block.evidenceData && block.evidenceData.type] || [];
  const submitterRole  = block.evidenceData && block.evidenceData.submittedByRole;
  if (expectedRoles.includes(submitterRole)) score += 15;

  return Math.min(100, Math.max(0, score));
}

// ─────────────────────────────────────────────
//  ANOMALY DETECTOR  (original contribution)
// ─────────────────────────────────────────────
/**
 * detectAnomalies(block, fullChain)
 *
 * Inspects a newly submitted block for behavioural red flags.
 * Returns an array of anomaly descriptors (empty = clean).
 *
 * Checks performed:
 *   1. Off-hours submission (before 06:00 or after 23:00 local)
 *   2. Rapid burst — same user submitted ≥ 3 blocks in last 2 minutes
 *   3. Exhibit ID collision — duplicate exhibit in chain
 *   4. Case number with no prior custody — orphaned submission
 */
function detectAnomalies(block, chain) {
  const flags = [];
  const ts    = new Date(block.timestamp);
  const hour  = ts.getUTCHours();

  // 1. Off-hours
  if (hour < 6 || hour >= 23) {
    flags.push({ code: 'OFF_HOURS', detail: `Submitted at UTC ${hour}:00` });
  }

  // 2. Rapid burst (same submitter, last 2 minutes)
  const twoMinAgo = ts.getTime() - 2 * 60 * 1000;
  const recentByUser = chain.slice(1).filter(b =>
    b.evidenceData.submittedBy === block.evidenceData.submittedBy &&
    new Date(b.timestamp).getTime() >= twoMinAgo &&
    b.blockId !== block.blockId
  );
  if (recentByUser.length >= 2) {
    flags.push({ code: 'BURST_SUBMISSION', detail: `${recentByUser.length} blocks from same user in 2 min` });
  }

  // 3. Exhibit ID collision
  const exhibitId = block.evidenceData.exhibitId;
  if (exhibitId) {
    const collision = chain.find(
      b => b.evidenceData.exhibitId === exhibitId && b.blockId !== block.blockId
    );
    if (collision) {
      flags.push({ code: 'EXHIBIT_COLLISION', detail: `Exhibit ${exhibitId} already registered at block #${collision.index}` });
    }
  }

  // 4. Orphaned case (case number appears only once, no prior custody)
  const caseNum   = block.evidenceData.caseNumber;
  const priorCase = chain.find(
    b => b.evidenceData.caseNumber === caseNum && b.blockId !== block.blockId
  );
  if (!priorCase && block.transactions && block.transactions.length === 0) {
    flags.push({ code: 'ORPHANED_CASE', detail: `First block for case ${caseNum} has no custody events yet` });
  }

  return flags;
}

// ─────────────────────────────────────────────
//  EVIDENCE BLOCK
// ─────────────────────────────────────────────
class Block {
  constructor(index, timestamp, evidenceData, previousHash = '', minedBy = 'SYSTEM') {
    this.index        = index;
    this.timestamp    = timestamp;
    this.evidenceData = evidenceData;   // { type, caseNumber, exhibitId, formData, submittedBy, role, ipAddress }
    this.previousHash = previousHash;
    this.hash         = '';
    this.nonce        = 0;
    this.blockId      = uuidv4();
    this.minedBy      = minedBy;
    this.transactions = [];             // chain of custody events
    this.merkleRoot   = '';
    this.vetaraScore  = 0;             // computed after mining
    this.anomalyFlags = [];            // anomaly detector output
    this.hash         = this.computeHash();
  }

  computeHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.evidenceData) +
        this.nonce +
        this.blockId +
        this.merkleRoot
      )
      .digest('hex');
  }

  // Proof-of-Work mining with configurable difficulty
  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.computeHash();
    }
    console.log(`[BLOCKCHAIN] Block #${this.index} mined: ${this.hash}`);
  }

  // Compute simple Merkle root from transaction array
  computeMerkleRoot() {
    if (this.transactions.length === 0) return '';
    let hashes = this.transactions.map(tx =>
      crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex')
    );
    while (hashes.length > 1) {
      if (hashes.length % 2 !== 0) hashes.push(hashes[hashes.length - 1]);
      const next = [];
      for (let i = 0; i < hashes.length; i += 2) {
        next.push(
          crypto.createHash('sha256').update(hashes[i] + hashes[i + 1]).digest('hex')
        );
      }
      hashes = next;
    }
    this.merkleRoot = hashes[0];
    return this.merkleRoot;
  }

  // Add a chain-of-custody transaction to this block
  addTransaction(tx) {
    this.transactions.push({ ...tx, txId: uuidv4(), txTime: new Date().toISOString() });
    this.computeMerkleRoot();
    this.hash = this.computeHash();
  }
}

// ─────────────────────────────────────────────
//  BLOCKCHAIN
// ─────────────────────────────────────────────
class EvidenceBlockchain {
  constructor(difficulty = 3) {
    this.chain        = [];
    this.difficulty   = difficulty;
    this.pendingTx    = [];
    this.storePath    = path.join(__dirname, '../data/chain.json');
    this._load();
    if (this.chain.length === 0) this._createGenesis();
  }

  // ── Genesis Block ──────────────────────────
  _createGenesis() {
    const genesis = new Block(
      0,
      new Date().toISOString(),
      {
        type: 'GENESIS',
        message: 'CustodyChain Evidence Blockchain – Initialized',
        author: 'Shubham Gadekar',
        institute: 'NFSU Goa',
        version: '1.0.0',
      },
      '0'
    );
    genesis.mineBlock(this.difficulty);
    this.chain.push(genesis);
    this._persist();
    console.log('[BLOCKCHAIN] Genesis block created.');
  }

  // ── Persistence ────────────────────────────
  _persist() {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.chain, null, 2));
  }

  _load() {
    if (fs.existsSync(this.storePath)) {
      try {
        const raw  = fs.readFileSync(this.storePath, 'utf8');
        const data = JSON.parse(raw);
        // Rehydrate as Block instances
        this.chain = data.map(b => {
          const block = Object.assign(new Block(0, '', {}), b);
          return block;
        });
        console.log(`[BLOCKCHAIN] Loaded ${this.chain.length} blocks from disk.`);
      } catch (e) {
        console.error('[BLOCKCHAIN] Failed to load chain:', e.message);
        this.chain = [];
      }
    }
  }

  // ── Latest block helper ────────────────────
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // ── Add Evidence Block ─────────────────────
  addEvidenceBlock(evidenceData, minedBy = 'SYSTEM') {
    const previousBlock = this.getLatestBlock();
    const block = new Block(
      this.chain.length,
      new Date().toISOString(),
      evidenceData,
      previousBlock.hash,
      minedBy
    );
    block.mineBlock(this.difficulty);

    // ── VETARA Score ──────────────────────────
    block.vetaraScore  = computeVETARA(block, previousBlock);

    // ── Anomaly Detection ─────────────────────
    block.anomalyFlags = detectAnomalies(block, this.chain);
    if (block.anomalyFlags.length > 0) {
      console.warn(`[VETARA] Anomalies detected on block #${block.index}:`,
        block.anomalyFlags.map(f => f.code).join(', '));
    }

    this.chain.push(block);
    this._persist();

    // Audit log
    this._audit({
      action    : 'BLOCK_ADDED',
      blockIndex: block.index,
      blockId   : block.blockId,
      hash      : block.hash,
      caseNumber: evidenceData.caseNumber,
      actor     : minedBy,
      vetaraScore: block.vetaraScore,
      anomalies : block.anomalyFlags.length,
    });

    return block;
  }

  // ── Chain of Custody transaction ───────────
  addCustodyTransaction(blockId, txData) {
    const block = this.chain.find(b => b.blockId === blockId);
    if (!block) throw new Error(`Block ${blockId} not found`);
    block.addTransaction(txData);
    this._persist();
    this._audit({ action: 'CUSTODY_TX', blockId, ...txData });
    return block;
  }

  // ── Integrity Validation ───────────────────
  isChainValid() {
    const errors = [];
    for (let i = 1; i < this.chain.length; i++) {
      const current  = this.chain[i];
      const previous = this.chain[i - 1];

      const recomputed = new Block(
        current.index,
        current.timestamp,
        current.evidenceData,
        current.previousHash,
        current.minedBy
      );
      recomputed.nonce      = current.nonce;
      recomputed.blockId    = current.blockId;
      recomputed.merkleRoot = current.merkleRoot;
      const expectedHash    = recomputed.computeHash();

      if (current.hash !== expectedHash) {
        errors.push({ block: i, reason: 'HASH_MISMATCH', stored: current.hash, expected: expectedHash });
      }
      if (current.previousHash !== previous.hash) {
        errors.push({ block: i, reason: 'PREVIOUS_HASH_MISMATCH' });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // ── Search helpers ─────────────────────────
  getBlockByCaseNumber(caseNumber) {
    return this.chain.filter(b => b.evidenceData.caseNumber === caseNumber);
  }

  getBlockByExhibit(exhibitId) {
    return this.chain.find(b => b.evidenceData.exhibitId === exhibitId);
  }

  getBlockByHash(hash) {
    return this.chain.find(b => b.hash === hash);
  }

  getStats() {
    const nonGenesis = this.chain.slice(1);
    const types = {};
    nonGenesis.forEach(b => {
      const t = b.evidenceData.type || 'UNKNOWN';
      types[t] = (types[t] || 0) + 1;
    });

    // Average VETARA score across all evidence blocks
    const avgVetara = nonGenesis.length
      ? Math.round(
          nonGenesis.reduce((sum, b) => sum + (b.vetaraScore || 0), 0) / nonGenesis.length
        )
      : 0;

    // Blocks with anomaly flags
    const anomalousCount = nonGenesis.filter(
      b => Array.isArray(b.anomalyFlags) && b.anomalyFlags.length > 0
    ).length;

    return {
      totalBlocks    : this.chain.length,
      evidenceBlocks : nonGenesis.length,
      byType         : types,
      latestHash     : this.getLatestBlock().hash,
      chainValid     : this.isChainValid().valid,
      avgVetaraScore : avgVetara,
      anomalousBlocks: anomalousCount,
    };
  }

  // ── Audit trail ────────────────────────────
  _audit(entry) {
    const logPath = path.join(__dirname, '../data/audit.log');
    const line    = JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n';
    fs.appendFileSync(logPath, line);
  }

  getAuditLog() {
    const logPath = path.join(__dirname, '../data/audit.log');
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l))
      .reverse();
  }
}

module.exports = new EvidenceBlockchain(3); // singleton
module.exports.computeVETARA  = computeVETARA;
module.exports.detectAnomalies = detectAnomalies;
