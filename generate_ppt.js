'use strict';

const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

// ── Theme colours ─────────────────────────────────────────────
const BG       = '0D1117';   // near-black
const ACCENT   = '00E5FF';   // cyan
const ACCENT2  = '7C3AED';   // purple
const WHITE    = 'FFFFFF';
const SUBTEXT  = 'A0AEC0';
const CARDbg   = '161B22';   // dark card

pptx.layout  = 'LAYOUT_WIDE'; // 13.33" x 7.5"
pptx.author  = 'Shubham Gadekar';
pptx.company = 'NFSU Goa';
pptx.subject = 'CustodyChain — Hackathon 2026';
pptx.title   = 'CustodyChain — Tamper-Proof Digital Evidence Management';

// ── Helper: dark slide background ────────────────────────────
function darkBg(slide) {
  slide.background = { color: BG };
}

// ── Helper: top accent bar ────────────────────────────────────
function accentBar(slide, color = ACCENT) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color },
    line: { color, width: 0 },
  });
}

// ── Helper: section label pill ────────────────────────────────
function pill(slide, text, x, y, color = ACCENT) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 2.0, h: 0.32,
    fill: { color },
    line: { color, width: 0 },
    rectRadius: 0.08,
  });
  slide.addText(text, {
    x, y, w: 2.0, h: 0.32,
    fontSize: 9, bold: true, color: BG,
    align: 'center', valign: 'middle',
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 1 — Title / Cover
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);

  // Left gradient panel
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 5.5, h: '100%',
    fill: { color: CARDbg },
    line: { color: CARDbg, width: 0 },
  });

  // Cyan vertical stripe
  s.addShape(pptx.ShapeType.rect, {
    x: 5.5, y: 0, w: 0.06, h: '100%',
    fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });

  // Chain icon placeholder (unicode)
  s.addText('⛓', {
    x: 0.4, y: 0.5, w: 1.2, h: 1.2,
    fontSize: 52, color: ACCENT, align: 'center',
  });

  s.addText('CustodyChain', {
    x: 0.3, y: 1.6, w: 5.0, h: 0.8,
    fontSize: 36, bold: true, color: WHITE,
    fontFace: 'Segoe UI',
  });

  s.addText('Tamper-Proof Digital Evidence Management\nwith VETARA Scoring & Anomaly Detection', {
    x: 0.3, y: 2.4, w: 5.0, h: 0.9,
    fontSize: 13, color: ACCENT,
    fontFace: 'Segoe UI', breakLine: true,
  });

  s.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 3.42, w: 4.6, h: 0,
    line: { color: ACCENT2, width: 1.2 },
  });

  s.addText('Shubham Gadekar', {
    x: 0.3, y: 3.6, w: 5.0, h: 0.35,
    fontSize: 13, bold: true, color: WHITE,
  });
  s.addText('National Forensic Sciences University, Goa Campus (NFSU Goa)', {
    x: 0.3, y: 3.95, w: 5.0, h: 0.32,
    fontSize: 10, color: SUBTEXT,
  });
  s.addText('Hackathon 2026  |  Cybersecurity Track', {
    x: 0.3, y: 4.28, w: 5.0, h: 0.3,
    fontSize: 10, color: SUBTEXT,
  });

  // Right panel content
  s.addText('🔐 Blockchain\n🧮 VETARA Score\n🚨 Anomaly Detector\n👥 5-Role RBAC\n📋 8 Evidence Forms', {
    x: 5.8, y: 1.5, w: 7.0, h: 3.5,
    fontSize: 19, color: WHITE, lineSpacingMultiple: 1.6,
    fontFace: 'Segoe UI',
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 2 — Problem Statement
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s, ACCENT2);

  pill(s, 'THE PROBLEM', 0.4, 0.22, ACCENT2);

  s.addText('Why Current Evidence Systems Fail', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 26, bold: true, color: WHITE,
  });

  const problems = [
    { icon: '🗄️', title: 'Centralised Databases', body: 'Single point of failure — one insider can alter or delete records without detection.' },
    { icon: '🔗', title: 'Chain-of-Custody Gaps', body: 'Manual log books are easy to manipulate; courts routinely reject uncorroborated evidence.' },
    { icon: '💰', title: 'Cost Barrier', body: 'Enterprise forensic platforms (EnCase, FTK) cost lakhs/year — out of reach for most state police units.' },
    { icon: '☁️', title: 'Cloud Dependency', body: 'SaaS tools require internet connectivity, DPA compliance, and trust in third-party vendors.' },
  ];

  problems.forEach((p, i) => {
    const x = (i % 2) * 6.5 + 0.4;
    const y = Math.floor(i / 2) * 2.7 + 1.45;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 6.0, h: 2.2,
      fill: { color: CARDbg },
      line: { color: ACCENT2, width: 1.2 },
      rectRadius: 0.1,
    });
    s.addText(p.icon + '  ' + p.title, { x: x + 0.2, y: y + 0.18, w: 5.6, h: 0.42, fontSize: 13, bold: true, color: ACCENT });
    s.addText(p.body, { x: x + 0.2, y: y + 0.62, w: 5.6, h: 1.4, fontSize: 11, color: SUBTEXT, wrap: true });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 3 — Our Solution
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s);

  pill(s, 'OUR SOLUTION', 0.4, 0.22);

  s.addText('CustodyChain — Purpose-Built Forensic Blockchain', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 24, bold: true, color: WHITE,
  });

  s.addText(
    'A self-hosted, offline-capable blockchain that seals every piece of digital ' +
    'evidence as an immutable block the moment it is seized — with no cloud ' +
    'dependency, no vendor lock-in, and automatic trust scoring on every record.',
    {
      x: 0.4, y: 1.28, w: 12.5, h: 0.75,
      fontSize: 12, color: SUBTEXT, wrap: true,
    }
  );

  const features = [
    { icon: '⛓', label: 'SHA-256 PoW Blockchain', desc: 'Each block mined with Proof-of-Work; tamper breaks the hash chain.' },
    { icon: '🌲', label: 'Merkle Tree Custody', desc: 'Every custody event hashed into a Merkle tree inside the block.' },
    { icon: '🧮', label: 'VETARA Score (Original)', desc: '0–100 per-block integrity rating — our novel algorithm.' },
    { icon: '🚨', label: 'Anomaly Detector (Original)', desc: 'Real-time flags: off-hours, burst, collisions, orphaned cases.' },
    { icon: '🔐', label: '5-Role RBAC', desc: 'IO / Forensic Expert / Supervisor / Legal / Admin with 11 permissions.' },
    { icon: '📋', label: '8 Evidence Form Types', desc: 'Phone, laptop, storage, image, audio, video, log, forensic report.' },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = col * 4.35 + 0.4;
    const y   = row * 2.35 + 2.15;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 4.0, h: 2.0,
      fill: { color: CARDbg },
      line: { color: ACCENT, width: 1 },
      rectRadius: 0.1,
    });
    s.addText(f.icon + '  ' + f.label, { x: x + 0.18, y: y + 0.14, w: 3.65, h: 0.4, fontSize: 12, bold: true, color: ACCENT });
    s.addText(f.desc, { x: x + 0.18, y: y + 0.58, w: 3.65, h: 1.2, fontSize: 10.5, color: SUBTEXT, wrap: true });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 4 — VETARA Algorithm (Original Contribution)
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s, ACCENT2);

  pill(s, 'ORIGINAL ALGO', 0.4, 0.22, ACCENT2);

  s.addText('VETARA — Verified Evidence Trust And Risk Assessment', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 22, bold: true, color: WHITE,
  });

  s.addText('Every evidence block receives a 0–100 integrity score the moment it is mined. Deterministic — same inputs always produce the same score, making it reproducible in court.', {
    x: 0.4, y: 1.28, w: 12.5, h: 0.6,
    fontSize: 11.5, color: SUBTEXT, wrap: true,
  });

  const factors = [
    { label: 'A. Chain Continuity',     pts: 30, desc: 'Hash correctly linked to previous block' },
    { label: 'B. Custody Event Depth',  pts: 20, desc: '≥3 custody events = full marks, scaled linearly below' },
    { label: 'C. Forensic Signature',   pts: 20, desc: 'Expert sign-off present on the block' },
    { label: 'D. Time-Gap Penalty',     pts: 15, desc: 'Deducted if gap to previous block > 72 hours' },
    { label: 'E. Role Appropriateness', pts: 15, desc: 'Submitting officer role matches evidence category' },
  ];

  factors.forEach((f, i) => {
    const y = i * 0.9 + 2.05;
    // Bar background
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.4, y, w: 12.0, h: 0.72,
      fill: { color: CARDbg },
      line: { color: CARDbg, width: 0 },
      rectRadius: 0.06,
    });
    // Filled bar
    const fillW = 12.0 * (f.pts / 100);
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.4, y, w: fillW, h: 0.72,
      fill: { color: i % 2 === 0 ? ACCENT : ACCENT2 },
      line: { color: 'transparent', width: 0 },
      rectRadius: 0.06,
    });
    s.addText(`${f.label}   —   ${f.desc}`, {
      x: 0.6, y: y + 0.15, w: 9.0, h: 0.4,
      fontSize: 11, bold: true, color: BG,
    });
    s.addText(`${f.pts} pts`, {
      x: 11.8, y: y + 0.15, w: 0.9, h: 0.4,
      fontSize: 12, bold: true, color: BG, align: 'right',
    });
  });

  s.addText('Total: 100 pts  |  Score < 60 → flagged LOW TRUST  |  Score ≥ 80 → HIGH TRUST', {
    x: 0.4, y: 6.65, w: 12.5, h: 0.35,
    fontSize: 10.5, color: ACCENT, italic: true, align: 'center',
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 5 — Anomaly Detector
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s);

  pill(s, 'ORIGINAL FEATURE', 0.4, 0.22);

  s.addText('Real-Time Anomaly Detector', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 24, bold: true, color: WHITE,
  });

  s.addText('Runs automatically on every new evidence submission. Returns an array of anomaly flags — empty means clean.', {
    x: 0.4, y: 1.28, w: 12.5, h: 0.45,
    fontSize: 12, color: SUBTEXT,
  });

  const anomalies = [
    {
      code: 'OFF_HOURS',
      title: 'Off-Hours Submission',
      desc: 'Flags evidence submitted before 06:00 or after 23:00 UTC. Unusual working hours may indicate unauthorised access.',
    },
    {
      code: 'BURST_SUBMISSION',
      title: 'Rapid Burst',
      desc: 'Same officer submits ≥3 evidence blocks within 2 minutes. Could indicate automated or forged batch submissions.',
    },
    {
      code: 'EXHIBIT_COLLISION',
      title: 'Exhibit ID Collision',
      desc: 'A duplicate exhibit ID already exists in the chain. Prevents the same physical item from being double-registered.',
    },
    {
      code: 'ORPHANED_CASE',
      title: 'Orphaned Case',
      desc: 'First block for a case number with zero custody events — highlights evidence submitted without proper intake procedure.',
    },
  ];

  anomalies.forEach((a, i) => {
    const x = (i % 2) * 6.5 + 0.4;
    const y = Math.floor(i / 2) * 2.5 + 1.95;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 6.0, h: 2.2,
      fill: { color: CARDbg },
      line: { color: ACCENT, width: 1 },
      rectRadius: 0.1,
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.18, y: y + 0.16, w: 2.4, h: 0.3,
      fill: { color: ACCENT },
      line: { color: ACCENT, width: 0 },
      rectRadius: 0.05,
    });
    s.addText(a.code, { x: x + 0.18, y: y + 0.16, w: 2.4, h: 0.3, fontSize: 8.5, bold: true, color: BG, align: 'center', valign: 'middle' });
    s.addText(a.title, { x: x + 0.18, y: y + 0.56, w: 5.65, h: 0.36, fontSize: 12.5, bold: true, color: WHITE });
    s.addText(a.desc, { x: x + 0.18, y: y + 0.95, w: 5.65, h: 1.05, fontSize: 10.5, color: SUBTEXT, wrap: true });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 6 — System Architecture
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s, ACCENT2);

  pill(s, 'ARCHITECTURE', 0.4, 0.22, ACCENT2);

  s.addText('How CustodyChain Works', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 24, bold: true, color: WHITE,
  });

  // Flow boxes
  const flow = [
    { label: 'Officer\nLogs In', sub: 'JWT auth\nbcrypt + RBAC' },
    { label: 'Fills\nEvidence Form', sub: '8 form types\nSHA-256 fingerprint' },
    { label: 'API Server\nValidates', sub: 'Express + Helmet\nRole permission check' },
    { label: 'Block\nMined', sub: 'SHA-256 PoW\nMerkle Tree built' },
    { label: 'VETARA &\nAnomaly Run', sub: 'Score 0-100\nFlags returned' },
    { label: 'Block Sealed\non Chain', sub: 'Immutable\nAudit logged' },
  ];

  flow.forEach((f, i) => {
    const x = i * 2.15 + 0.3;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.5, w: 1.9, h: 1.7,
      fill: { color: CARDbg },
      line: { color: i % 2 === 0 ? ACCENT : ACCENT2, width: 1.2 },
      rectRadius: 0.1,
    });
    s.addText(f.label, { x, y: 1.58, w: 1.9, h: 0.72, fontSize: 11.5, bold: true, color: WHITE, align: 'center', valign: 'middle', wrap: true });
    s.addText(f.sub, { x, y: 2.3, w: 1.9, h: 0.75, fontSize: 9, color: SUBTEXT, align: 'center', wrap: true });

    if (i < flow.length - 1) {
      s.addShape(pptx.ShapeType.line, {
        x: x + 1.9, y: 2.32, w: 0.25, h: 0,
        line: { color: ACCENT, width: 1.5 },
      });
    }
  });

  // Layer stack below
  const layers = [
    { label: 'Frontend', detail: 'HTML/CSS/JS  ·  Dark-theme SPA  ·  Role-aware sidebar', color: ACCENT2 },
    { label: 'API Layer', detail: 'Express  ·  Helmet  ·  Rate-limit  ·  JWT middleware', color: ACCENT },
    { label: 'Blockchain Engine', detail: 'PoW  ·  Merkle Tree  ·  VETARA  ·  Anomaly Detector  ·  Audit Log', color: ACCENT2 },
    { label: 'Persistence', detail: 'chain.json  ·  audit.log  (append-only, local disk)', color: ACCENT },
  ];

  layers.forEach((l, i) => {
    const y = i * 0.82 + 3.55;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.4, y, w: 12.5, h: 0.68,
      fill: { color: CARDbg },
      line: { color: l.color, width: 1 },
      rectRadius: 0.06,
    });
    s.addText(l.label, { x: 0.6, y: y + 0.12, w: 2.2, h: 0.44, fontSize: 11, bold: true, color: l.color });
    s.addText(l.detail, { x: 2.9, y: y + 0.12, w: 9.8, h: 0.44, fontSize: 10.5, color: SUBTEXT });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 7 — RBAC & Evidence Forms
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s);

  pill(s, 'ACCESS CONTROL', 0.4, 0.22);

  s.addText('Role-Based Access  ×  8 Evidence Types', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 24, bold: true, color: WHITE,
  });

  // RBAC table
  const headers = ['Role', 'Submit', 'Approve', 'Forensic Sign', 'Audit Log', 'Delete'];
  const rows = [
    ['ADMIN',           '✅', '✅', '✅', '✅', '✅'],
    ['IO',              '✅', '❌', '❌', '❌', '❌'],
    ['FORENSIC EXPERT', '❌', '❌', '✅', '❌', '❌'],
    ['SUPERVISOR',      '❌', '✅', '❌', '✅', '❌'],
    ['LEGAL OFFICER',   '❌', '❌', '❌', '❌', '❌'],
  ];

  const colW = [2.6, 1.4, 1.4, 1.8, 1.4, 1.4];
  const colX = [0.4];
  colW.forEach((w, i) => { if (i < colW.length - 1) colX.push(colX[i] + colW[i]); });

  // Header row
  headers.forEach((h, c) => {
    s.addShape(pptx.ShapeType.rect, {
      x: colX[c], y: 1.42, w: colW[c], h: 0.38,
      fill: { color: ACCENT2 },
      line: { color: ACCENT2, width: 0 },
    });
    s.addText(h, { x: colX[c], y: 1.42, w: colW[c], h: 0.38, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' });
  });

  rows.forEach((row, r) => {
    const y = r * 0.44 + 1.82;
    const bg = r % 2 === 0 ? CARDbg : '0F141A';
    row.forEach((cell, c) => {
      s.addShape(pptx.ShapeType.rect, {
        x: colX[c], y, w: colW[c], h: 0.42,
        fill: { color: bg },
        line: { color: CARDbg, width: 0 },
      });
      s.addText(cell, {
        x: colX[c], y, w: colW[c], h: 0.42,
        fontSize: c === 0 ? 10 : 12,
        bold: c === 0,
        color: c === 0 ? ACCENT : WHITE,
        align: 'center', valign: 'middle',
      });
    });
  });

  // Evidence forms on right
  const forms = [
    '📱  Phone / Tablet / iPad',
    '💻  Desktop / Laptop / Server',
    '💾  External Storage Media',
    '🖼️  Image File',
    '🎵  Audio File',
    '🎬  Video File',
    '📄  Log File',
    '📑  Forensic Report',
  ];

  s.addText('Evidence Form Types', {
    x: 9.2, y: 1.38, w: 3.8, h: 0.38,
    fontSize: 12, bold: true, color: ACCENT, align: 'center',
  });

  forms.forEach((f, i) => {
    const y = i * 0.55 + 1.82;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 9.2, y, w: 3.8, h: 0.46,
      fill: { color: CARDbg },
      line: { color: i % 2 === 0 ? ACCENT : ACCENT2, width: 0.8 },
      rectRadius: 0.06,
    });
    s.addText(f, { x: 9.35, y, w: 3.6, h: 0.46, fontSize: 10.5, color: WHITE, valign: 'middle' });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 8 — Security Stack
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s, ACCENT2);

  pill(s, 'SECURITY', 0.4, 0.22, ACCENT2);

  s.addText('Security Layers', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 26, bold: true, color: WHITE,
  });

  const secItems = [
    { layer: 'Authentication',    detail: 'JWT HS256 · 8-hour expiry · bcrypt (10 rounds) password hashing' },
    { layer: 'Rate Limiting',     detail: '20 login attempts / 15 min · 200 API calls / min (express-rate-limit)' },
    { layer: 'HTTP Hardening',    detail: 'Helmet.js security headers: CSP, HSTS, X-Frame-Options, etc.' },
    { layer: 'Evidence Integrity',detail: 'SHA-256 fingerprint of every form payload stored on-chain' },
    { layer: 'Block Immutability',detail: 'PoW nonce + Merkle root + all fields baked into block hash' },
    { layer: 'Tamper Detection',  detail: 'Full chain re-validation on every /api/blockchain/validate call' },
    { layer: 'Audit Trail',       detail: 'Append-only structured JSON log — never updated, only appended' },
    { layer: 'VETARA Alerts',     detail: 'Anomalous submissions auto-flagged with code + detail string' },
  ];

  secItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * 6.5 + 0.4;
    const y = row * 1.2 + 1.42;

    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 6.0, h: 1.0,
      fill: { color: CARDbg },
      line: { color: col === 0 ? ACCENT : ACCENT2, width: 1 },
      rectRadius: 0.07,
    });

    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.12, y: y + 0.12, w: 0.08, h: 0.76,
      fill: { color: col === 0 ? ACCENT : ACCENT2 },
      line: { color: 'transparent', width: 0 },
      rectRadius: 0.04,
    });

    s.addText(item.layer, { x: x + 0.32, y: y + 0.1, w: 5.55, h: 0.34, fontSize: 11.5, bold: true, color: WHITE });
    s.addText(item.detail, { x: x + 0.32, y: y + 0.46, w: 5.55, h: 0.44, fontSize: 10, color: SUBTEXT, wrap: true });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 9 — Impact & Feasibility
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  accentBar(s);

  pill(s, 'IMPACT', 0.4, 0.22);

  s.addText('Impact & Feasibility', {
    x: 0.4, y: 0.65, w: 12.5, h: 0.55,
    fontSize: 26, bold: true, color: WHITE,
  });

  const impact = [
    { icon: '⚖️', title: 'Court-Ready Evidence', body: 'Immutable SHA-256 hash chain provides cryptographic proof of evidence integrity admissible in court.' },
    { icon: '🏛️', title: 'Accessible to All Units', body: 'Runs on a single laptop with Node.js — no cloud subscription, no enterprise licence fee.' },
    { icon: '🔬', title: 'Forensic Automation', body: 'VETARA scoring replaces manual integrity review, saving forensic expert hours per case.' },
    { icon: '🌐', title: 'Offline First', body: 'Works in areas with no internet. Chain syncs and validates locally — viable for remote field ops.' },
    { icon: '📈', title: 'Scalable Roadmap', body: 'Designed to migrate to IPFS persistence and Ed25519 officer signatures in the next iteration.' },
    { icon: '🎓', title: 'Academic Foundation', body: 'Built at NFSU Goa — grounded in forensic science standards taught by faculty practitioners.' },
  ];

  impact.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = col * 4.35 + 0.4;
    const y   = row * 2.55 + 1.52;

    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 4.0, h: 2.2,
      fill: { color: CARDbg },
      line: { color: col % 2 === 0 ? ACCENT : ACCENT2, width: 1 },
      rectRadius: 0.1,
    });
    s.addText(item.icon, { x, y: y + 0.12, w: 4.0, h: 0.45, fontSize: 20, align: 'center' });
    s.addText(item.title, { x: x + 0.18, y: y + 0.6, w: 3.65, h: 0.36, fontSize: 11.5, bold: true, color: ACCENT });
    s.addText(item.body, { x: x + 0.18, y: y + 1.0, w: 3.65, h: 1.05, fontSize: 10, color: SUBTEXT, wrap: true });
  });
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE 10 — Thank You / Close
// ═══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);

  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: CARDbg },
    line: { color: CARDbg, width: 0 },
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.08, h: '100%',
    fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 13.25, y: 0, w: 0.08, h: '100%',
    fill: { color: ACCENT2 },
    line: { color: ACCENT2, width: 0 },
  });

  s.addText('⛓', { x: 0, y: 1.2, w: 13.33, h: 1.2, fontSize: 52, color: ACCENT, align: 'center' });

  s.addText('Thank You', {
    x: 0, y: 2.5, w: 13.33, h: 0.9,
    fontSize: 42, bold: true, color: WHITE, align: 'center',
  });

  s.addText('CustodyChain — Tamper-Proof Digital Evidence Management', {
    x: 0, y: 3.5, w: 13.33, h: 0.45,
    fontSize: 14, color: ACCENT, align: 'center',
  });

  s.addShape(pptx.ShapeType.line, {
    x: 3.5, y: 4.1, w: 6.33, h: 0,
    line: { color: ACCENT2, width: 1 },
  });

  s.addText('Shubham Gadekar', {
    x: 0, y: 4.3, w: 13.33, h: 0.42,
    fontSize: 15, bold: true, color: WHITE, align: 'center',
  });
  s.addText('National Forensic Sciences University, Goa Campus (NFSU Goa)', {
    x: 0, y: 4.75, w: 13.33, h: 0.35,
    fontSize: 11, color: SUBTEXT, align: 'center',
  });
  s.addText('Hackathon 2026  |  Cybersecurity Track  |  Digital Forensics', {
    x: 0, y: 5.15, w: 13.33, h: 0.32,
    fontSize: 10.5, color: SUBTEXT, align: 'center',
  });
}

// ── Save ──────────────────────────────────────────────────────
const OUT = 'CustodyChain_Presentation.pptx';
pptx.writeFile({ fileName: OUT })
  .then(() => console.log(`✅  Saved: ${OUT}`))
  .catch(err => { console.error('❌  Error:', err); process.exit(1); });
