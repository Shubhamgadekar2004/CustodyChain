'use strict';
/* ═══════════════════════════════════════════════════════════════════
   DEMS Dashboard – Frontend Controller
   ═══════════════════════════════════════════════════════════════════ */

// ── Session ────────────────────────────────────────────────────────────────────
const token = sessionStorage.getItem('dems_token');
const user  = JSON.parse(sessionStorage.getItem('dems_user') || 'null');

if (!token || !user) { window.location.href = '/'; }

const PERMISSIONS = {
  ADMIN         : ['VIEW_ALL_EVIDENCE','SUBMIT_EVIDENCE','APPROVE_EVIDENCE','DELETE_EVIDENCE','MANAGE_USERS','VIEW_BLOCKCHAIN','VALIDATE_CHAIN','VIEW_AUDIT_LOG','EXPORT_REPORT','CHAIN_OF_CUSTODY','SIGN_EVIDENCE'],
  IO            : ['SUBMIT_EVIDENCE','VIEW_OWN_EVIDENCE','VIEW_CASE_EVIDENCE','CHAIN_OF_CUSTODY','EXPORT_REPORT'],
  FORENSIC_EXPERT:['VIEW_ALL_EVIDENCE','SIGN_EVIDENCE','ADD_FORENSIC_NOTES','VIEW_BLOCKCHAIN','CHAIN_OF_CUSTODY','EXPORT_REPORT','VALIDATE_CHAIN'],
  SUPERVISOR    : ['VIEW_ALL_EVIDENCE','APPROVE_EVIDENCE','VIEW_BLOCKCHAIN','VIEW_AUDIT_LOG','EXPORT_REPORT','CHAIN_OF_CUSTODY'],
  LEGAL_OFFICER : ['VIEW_ALL_EVIDENCE','VIEW_BLOCKCHAIN','EXPORT_REPORT'],
};

function can(action) {
  return (PERMISSIONS[user.role] || []).includes(action);
}

// ── API Helper ─────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`/api${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Sidebar ────────────────────────────────────────────────────────────────────
function logout() {
  sessionStorage.clear();
  window.location.href = '/';
}

function initSidebar() {
  // Avatar & name
  const initials = user.fullName ? user.fullName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : '??';
  document.getElementById('sb-avatar').textContent = initials;
  document.getElementById('sb-name').textContent   = user.fullName || user.username;
  const roleBadge = document.getElementById('sb-role');
  roleBadge.textContent = user.role.replace(/_/g,' ');
  roleBadge.className = `role-badge role-${user.role}`;
  document.getElementById('topbar-badge').textContent = `🪪 ${user.badge}`;

  // Hide nav items user can't access
  document.querySelectorAll('.nav-item[data-perm]').forEach(item => {
    if (!can(item.dataset.perm)) item.classList.add('hidden');
  });

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const sec = item.dataset.section;
      if (!sec) return;
      navigate(sec);
    });
  });

  // Hamburger for mobile
  document.getElementById('hamburger').style.display = 'block';
}

let currentSection = 'dashboard';
function navigate(section) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const secEl = document.getElementById(`sec-${section}`);
  const navEl = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (secEl) secEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  const titles = {
    'dashboard'          : '🏠 Dashboard',
    'submit-evidence'    : '➕ Submit Evidence',
    'my-evidence'        : '📁 My Evidence',
    'all-evidence'       : '📋 All Evidence',
    'case-search'        : '🔍 Case Search',
    'blockchain-explorer': '⛓ Chain Explorer',
    'chain-validate'     : '✅ Validate Chain',
    'audit-log'          : '📊 Audit Log',
    'user-management'    : '👥 User Management',
  };
  document.getElementById('page-title').textContent = titles[section] || section;

  currentSection = section;
  onSectionActivated(section);

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function onSectionActivated(section) {
  switch(section) {
    case 'dashboard'          : loadDashboard();           break;
    case 'my-evidence'        : loadMyEvidence();          break;
    case 'all-evidence'       : loadAllEvidence();         break;
    case 'blockchain-explorer': loadChain();               break;
    case 'audit-log'          : loadAuditLog();            break;
    case 'user-management'    : loadUsers();               break;
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const r = await api('GET', '/evidence/stats');
    const s = r.stats;
    document.getElementById('stat-blocks').textContent   = s.totalBlocks;
    document.getElementById('stat-evidence').textContent = s.evidenceBlocks;
    document.getElementById('stat-phone').textContent    = s.byType['PHONE_TAB_IPAD'] || 0;
    document.getElementById('stat-desktop').textContent  = s.byType['DESKTOP_LAPTOP_SERVER'] || 0;
    document.getElementById('stat-storage').textContent  = s.byType['EXTERNAL_STORAGE'] || 0;
    document.getElementById('stat-image').textContent    = s.byType['IMAGE_EVIDENCE'] || 0;
    document.getElementById('stat-audio').textContent    = s.byType['AUDIO_EVIDENCE'] || 0;
    document.getElementById('stat-log').textContent      = s.byType['LOG_FILE'] || 0;
    document.getElementById('stat-video').textContent    = s.byType['VIDEO_EVIDENCE'] || 0;
    document.getElementById('stat-report').textContent   = s.byType['FORENSIC_REPORT'] || 0;

    const integrityEl = document.getElementById('integrity-panel');
    if (s.chainValid) {
      integrityEl.innerHTML = `
        <div style="font-size:3rem">✅</div>
        <div style="color:var(--success);font-size:1.1rem;font-weight:600;margin-top:0.5rem">Chain Integrity: VALID</div>
        <div class="text-muted text-sm mt-1">All ${s.totalBlocks} blocks verified</div>
        <div class="text-muted text-sm mono mt-1">${s.latestHash.substring(0,32)}…</div>`;
      updateChainStatusIndicator(true);
    } else {
      integrityEl.innerHTML = `
        <div style="font-size:3rem">❌</div>
        <div style="color:var(--danger);font-size:1.1rem;font-weight:600;margin-top:0.5rem">Chain Integrity: COMPROMISED</div>
        <div class="text-muted text-sm mt-1">Tampering detected! Contact administrator immediately.</div>`;
      updateChainStatusIndicator(false);
    }

    // Recent activity (last 5 blocks)
    const br = await api('GET', '/evidence/all').catch(() => ({ evidence: [] }));
    const recent = (br.evidence || []).slice(-5).reverse();
    const actEl  = document.getElementById('recent-activity');
    if (recent.length === 0) {
      actEl.innerHTML = '<div class="text-muted text-sm">No evidence submitted yet.</div>';
    } else {
      actEl.innerHTML = recent.map(b => `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--card-border)">
          <span style="font-size:1.2rem">${typeIcon(b.evidenceData.type)}</span>
          <div style="flex:1">
            <div style="font-size:0.85rem;font-weight:600">${b.evidenceData.exhibitMarkedAs} – ${b.evidenceData.caseNumber}</div>
            <div class="text-muted text-sm">${b.evidenceData.submittedBy} · ${fmtDate(b.evidenceData.submittedAt)}</div>
          </div>
          <span class="status status-${(b.evidenceData.status||'submitted').toLowerCase()}">${b.evidenceData.status||'SUBMITTED'}</span>
        </div>`).join('');
    }
  } catch(e) {
    toast(e.message, 'error');
  }
}

function updateChainStatusIndicator(valid) {
  const el = document.getElementById('chain-status-indicator');
  el.className = `chain-status${valid ? '' : ' invalid'}`;
  el.innerHTML = `<div class="dot"></div> Chain: ${valid ? 'VALID ✅' : 'COMPROMISED ❌'}`;
}

// ── Evidence Submission ────────────────────────────────────────────────────────
let selectedType = null;

function selectEvidenceType(type, btn) {
  selectedType = type;
  document.querySelectorAll('[id^="form-"]').forEach(f => f.style.display = 'none');
  document.getElementById(`form-${type}`).style.display = 'block';
  document.getElementById('submit-btn-area').style.display = 'block';
  // Update button states
  document.querySelectorAll('#sec-submit-evidence .btn').forEach(b => b.classList.remove('btn-primary'));
  btn.classList.add('btn-primary');
  document.getElementById('alert-submit').classList.remove('show');
}

function resetForm() {
  if (selectedType) document.getElementById(`form-${selectedType}`).reset();
}

function getFormData(formEl) {
  const fd = {};
  new FormData(formEl).forEach((v, k) => { fd[k] = v; });
  // checkboxes (not included in FormData if unchecked)
  formEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (!(cb.name in fd)) fd[cb.name] = false;
    else fd[cb.name] = true;
  });
  return fd;
}

async function submitEvidence() {
  if (!selectedType) { toast('Select evidence type first', 'warning'); return; }
  const formEl = document.getElementById(`form-${selectedType}`);
  const alertEl = document.getElementById('alert-submit');

  // Basic validation
  const required = formEl.querySelectorAll('[required]');
  let valid = true;
  required.forEach(el => { if (!el.value.trim()) { el.style.borderColor='var(--danger)'; valid=false; } else { el.style.borderColor=''; } });
  if (!valid) {
    alertEl.className = 'alert alert-danger show';
    alertEl.innerHTML = '⚠️ Please fill in all required fields.';
    return;
  }

  const formData = getFormData(formEl);
  const caseNumber    = formData.caseNumber;
  const exhibitMarkedAs = formData.exhibitMarkedAs;

  try {
    const r = await api('POST', '/evidence/submit', {
      type: selectedType,
      caseNumber,
      exhibitMarkedAs,
      formData,
    });

    alertEl.className = 'alert alert-success show';
    alertEl.innerHTML = `
      ✅ Evidence registered on blockchain!<br/>
      <strong>Exhibit ID:</strong> ${r.exhibitId} &nbsp;
      <strong>Block #:</strong> ${r.blockIndex} &nbsp;
      <strong>Hash:</strong> <span class="mono">${r.blockHash.substring(0,24)}…</span>`;
    formEl.reset();
    toast('Evidence successfully added to blockchain!', 'success');
  } catch(e) {
    alertEl.className = 'alert alert-danger show';
    alertEl.innerHTML = `❌ ${e.message}`;
    toast(e.message, 'error');
  }
}

// ── Evidence Table Helper ──────────────────────────────────────────────────────
function typeIcon(t) {
  return { PHONE_TAB_IPAD:'📱', DESKTOP_LAPTOP_SERVER:'💻', EXTERNAL_STORAGE:'💾' }[t] || '📦';
}
function fmtDate(d) { return d ? new Date(d).toLocaleString('en-IN') : '—'; }

function evidenceTable(blocks, container) {
  if (!blocks || blocks.length === 0) {
    document.getElementById(container).innerHTML = '<div class="text-muted">No records found.</div>';
    return;
  }
  const rows = blocks.map(b => {
    const ed = b.evidenceData;
    return `<tr>
      <td><span class="mono">${b.index}</span></td>
      <td><span class="type-badge type-${ed.type}">${typeIcon(ed.type)} ${ed.type.replace(/_/g,' ')}</span></td>
      <td>${ed.caseNumber}</td>
      <td><strong>${ed.exhibitMarkedAs}</strong> <span class="text-muted text-sm">${ed.exhibitId||''}</span></td>
      <td>${ed.submittedBy} <span class="text-muted text-sm">(${ed.submittedByRole})</span></td>
      <td>${fmtDate(ed.submittedAt)}</td>
      <td><span class="status status-${(ed.status||'submitted').toLowerCase()}">${ed.status||'SUBMITTED'}</span></td>
      <td style="display:flex;gap:0.4rem;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="viewEvidence('${b.blockId}')">👁 View</button>
        ${can('APPROVE_EVIDENCE') && ed.status!=='APPROVED' ? `<button class="btn btn-success btn-sm" onclick="approveEvidence('${b.blockId}')">✅ Approve</button>` : ''}
        ${can('SIGN_EVIDENCE') && !ed.forensicSignature ? `<button class="btn btn-accent btn-sm" onclick="signEvidence('${b.blockId}')">✍️ Sign</button>` : ''}
        ${can('CHAIN_OF_CUSTODY') ? `<button class="btn btn-warning btn-sm" onclick="addCustody('${b.blockId}')">⛓ Custody</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  document.getElementById(container).innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>#</th><th>Type</th><th>Case No.</th><th>Exhibit</th>
          <th>Submitted By</th><th>Date</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadMyEvidence() {
  try {
    const r = await api('GET', '/evidence/my');
    evidenceTable(r.evidence, 'my-evidence-content');
  } catch(e) { toast(e.message,'error'); }
}

async function loadAllEvidence() {
  try {
    const r = await api('GET', '/evidence/all');
    evidenceTable(r.evidence, 'all-evidence-content');
  } catch(e) { toast(e.message,'error'); }
}

async function searchCase() {
  const cn = document.getElementById('case-search-input').value.trim();
  if (!cn) { toast('Enter a case number', 'warning'); return; }
  try {
    const r = await api('GET', `/evidence/case/${encodeURIComponent(cn)}`);
    const el = document.getElementById('case-search-results');
    if (!r.evidence.length) { el.innerHTML = '<div class="text-muted">No results.</div>'; return; }
    evidenceTable(r.evidence, 'case-search-results');
    // evidenceTable overwrites the element, re-do it
    el.innerHTML = el.innerHTML; // no-op needed since already updated
  } catch(e) { toast(e.message,'error'); }
}

// ── View Evidence Detail ───────────────────────────────────────────────────────
async function viewEvidence(blockId) {
  try {
    const r = await api('GET', `/blockchain/chain`);
    const block = r.chain.find(b => b.blockId === blockId);
    if (!block) { toast('Block not found','error'); return; }
    const ed = block.evidenceData;

    const custodyHtml = (block.transactions||[]).map(tx => `
      <li class="custody-item">
        <div class="tx-action">${tx.action}</div>
        <div class="tx-detail">${tx.actor} (${tx.role}) · ${fmtDate(tx.txTime)}${tx.note ? ' — ' + tx.note : ''}</div>
      </li>`).join('') || '<li class="text-muted text-sm">No custody events.</li>';

    document.getElementById('modal-exhibit-title').innerHTML = `
      ${typeIcon(ed.type)} ${ed.exhibitMarkedAs} &nbsp;
      <span class="status status-${(ed.status||'submitted').toLowerCase()}">${ed.status||'SUBMITTED'}</span>`;

    document.getElementById('modal-body').innerHTML = `
      <div class="block-meta" style="margin-bottom:1.5rem">
        <div class="block-meta-item"><div class="label">Case Number</div><div class="value">${ed.caseNumber}</div></div>
        <div class="block-meta-item"><div class="label">Exhibit ID</div><div class="value">${ed.exhibitId||'—'}</div></div>
        <div class="block-meta-item"><div class="label">Type</div><div class="value">${ed.type}</div></div>
        <div class="block-meta-item"><div class="label">Submitted By</div><div class="value">${ed.submittedBy} (${ed.submittedByRole})</div></div>
        <div class="block-meta-item"><div class="label">Badge</div><div class="value">${ed.submittedByBadge||'—'}</div></div>
        <div class="block-meta-item"><div class="label">Submitted At</div><div class="value">${fmtDate(ed.submittedAt)}</div></div>
        <div class="block-meta-item"><div class="label">Block Index</div><div class="value">${block.index}</div></div>
        <div class="block-meta-item"><div class="label">Block Hash</div><div class="value mono">${block.hash.substring(0,32)}…</div></div>
        <div class="block-meta-item"><div class="label">Data Hash (SHA-256)</div><div class="value mono">${ed.dataHash ? ed.dataHash.substring(0,32)+'…' : '—'}</div></div>
        ${ed.forensicSignature ? `<div class="block-meta-item"><div class="label">Forensic Signature</div><div class="value mono">${ed.forensicSignature.substring(0,32)}…</div></div>` : ''}
        ${ed.approvedBy ? `<div class="block-meta-item"><div class="label">Approved By</div><div class="value">${ed.approvedBy}</div></div>` : ''}
      </div>

      <h4 style="margin-bottom:0.75rem;color:var(--accent)">🔗 Chain of Custody</h4>
      <ul class="custody-timeline">${custodyHtml}</ul>

      <h4 style="margin:1.5rem 0 0.75rem;color:var(--accent)">📋 Form Data</h4>
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:1rem;font-size:0.8rem">
        ${Object.entries(ed.formData||{}).map(([k,v]) => v ? `<div style="margin-bottom:0.3rem"><span class="text-muted">${k}:</span> <strong>${v}</strong></div>` : '').join('')}
      </div>`;

    openModal('evidence-modal');
  } catch(e) { toast(e.message,'error'); }
}

// ── Approve Evidence ───────────────────────────────────────────────────────────
async function approveEvidence(blockId) {
  if (!confirm('Approve this evidence record?')) return;
  try {
    await api('POST', `/evidence/approve/${blockId}`, { note: `Approved by ${user.fullName}` });
    toast('Evidence approved!', 'success');
    onSectionActivated(currentSection);
  } catch(e) { toast(e.message,'error'); }
}

// ── Sign Evidence ──────────────────────────────────────────────────────────────
async function signEvidence(blockId) {
  const notes = prompt('Enter forensic notes / remarks:');
  if (notes === null) return;
  try {
    const r = await api('POST', `/evidence/sign/${blockId}`, { notes });
    toast(`Evidence signed! Sig: ${r.sigHash.substring(0,16)}…`, 'success');
    onSectionActivated(currentSection);
  } catch(e) { toast(e.message,'error'); }
}

// ── Add Custody Event ──────────────────────────────────────────────────────────
async function addCustody(blockId) {
  const action = prompt('Custody action (TRANSFER / ANALYSIS / RETURN / COURT_SUBMISSION):','TRANSFER');
  if (!action) return;
  const note = prompt('Note / remarks:') || '';
  try {
    await api('POST', `/evidence/custody/${blockId}`, { action, note });
    toast('Custody event recorded on blockchain!', 'success');
  } catch(e) { toast(e.message,'error'); }
}

// ── Blockchain Explorer ────────────────────────────────────────────────────────
async function loadChain() {
  const el = document.getElementById('chain-content');
  el.innerHTML = '<div class="text-muted">Loading chain…</div>';
  try {
    const r = await api('GET', '/blockchain/chain');
    const blocks = [...r.chain].reverse();
    el.innerHTML = `<div class="text-sm text-muted mb-2">Total Blocks: ${r.length}</div>
    <div class="block-explorer">
      ${blocks.map(b => `
        <div class="bc-block">
          <div class="bc-block-header">
            <span class="block-index">Block #${b.index}</span>
            <span class="block-hash">${b.hash}</span>
            ${b.evidenceData.type ? `<span class="type-badge type-${b.evidenceData.type}">${typeIcon(b.evidenceData.type)}</span>` : '<span class="type-badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted)">GENESIS</span>'}
          </div>
          <div class="block-meta">
            <div class="block-meta-item"><div class="label">Timestamp</div><div class="value">${fmtDate(b.timestamp)}</div></div>
            <div class="block-meta-item"><div class="label">Mined By</div><div class="value">${b.minedBy}</div></div>
            <div class="block-meta-item"><div class="label">Nonce</div><div class="value">${b.nonce}</div></div>
            <div class="block-meta-item"><div class="label">Prev Hash</div><div class="value mono">${(''+b.previousHash).substring(0,24)}…</div></div>
            ${b.evidenceData.caseNumber ? `<div class="block-meta-item"><div class="label">Case No.</div><div class="value">${b.evidenceData.caseNumber}</div></div>` : ''}
            ${b.evidenceData.exhibitMarkedAs ? `<div class="block-meta-item"><div class="label">Exhibit</div><div class="value">${b.evidenceData.exhibitMarkedAs}</div></div>` : ''}
            <div class="block-meta-item"><div class="label">Custody Events</div><div class="value">${(b.transactions||[]).length}</div></div>
            ${b.merkleRoot ? `<div class="block-meta-item"><div class="label">Merkle Root</div><div class="value mono">${b.merkleRoot.substring(0,20)}…</div></div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
  } catch(e) { toast(e.message,'error'); el.innerHTML = '<div class="text-danger">Failed to load chain.</div>'; }
}

// ── Validate Chain ─────────────────────────────────────────────────────────────
async function validateChain() {
  const el = document.getElementById('validation-result');
  el.innerHTML = '<div style="text-align:center"><div class="loader" style="width:32px;height:32px;border-width:3px;margin:auto"></div><div class="text-muted text-sm mt-2">Validating…</div></div>';
  try {
    const r = await api('GET', '/blockchain/validate');
    if (r.valid) {
      el.innerHTML = `<div class="alert alert-success show">
        ✅ Blockchain is VALID – All blocks are cryptographically intact. No tampering detected.
      </div>`;
      updateChainStatusIndicator(true);
      toast('Chain validation passed!', 'success');
    } else {
      el.innerHTML = `<div class="alert alert-danger show">
        ❌ Chain COMPROMISED – ${r.errors.length} integrity error(s) found:<br/>
        <ul style="margin-top:0.5rem;padding-left:1.2rem">
          ${r.errors.map(e => `<li>Block #${e.block}: ${e.reason}</li>`).join('')}
        </ul>
      </div>`;
      updateChainStatusIndicator(false);
      toast('Chain integrity check FAILED!', 'error');
    }
  } catch(e) { toast(e.message,'error'); el.innerHTML=''; }
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
async function loadAuditLog() {
  const el = document.getElementById('audit-log-content');
  try {
    const r = await api('GET', '/blockchain/audit');
    if (!r.log.length) { el.innerHTML = '<div class="text-muted">No audit entries.</div>'; return; }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Case No.</th><th>Block</th><th>Hash</th></tr></thead>
      <tbody>${r.log.map(e =>`<tr>
        <td class="text-sm">${fmtDate(e.ts)}</td>
        <td><span class="status status-submitted">${e.action}</span></td>
        <td>${e.actor||'—'}</td>
        <td>${e.caseNumber||'—'}</td>
        <td>${e.blockIndex !== undefined ? '#'+e.blockIndex : '—'}</td>
        <td class="mono">${e.hash ? e.hash.substring(0,16)+'…' : '—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { toast(e.message,'error'); }
}

// ── User Management ────────────────────────────────────────────────────────────
async function loadUsers() {
  const el = document.getElementById('users-content');
  try {
    const r = await api('GET', '/admin/users');
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Username</th><th>Full Name</th><th>Role</th><th>Badge</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${r.users.map(u => `<tr>
        <td class="mono text-sm">${u.id}</td>
        <td>${u.username}</td>
        <td>${u.fullName}</td>
        <td><span class="role-badge role-${u.role}">${u.role.replace(/_/g,' ')}</span></td>
        <td>${u.badge}</td>
        <td><span class="status ${u.active?'status-approved':'status-pending'}">${u.active?'ACTIVE':'INACTIVE'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="toggleUser('${u.id}', ${!u.active})">
            ${u.active ? '🚫 Deactivate' : '✅ Activate'}
          </button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { toast(e.message,'error'); }
}

function openAddUserModal() { openModal('add-user-modal'); }

async function addUser() {
  const alertEl = document.getElementById('add-user-alert');
  const body = {
    fullName : document.getElementById('nu-fullname').value.trim(),
    username : document.getElementById('nu-username').value.trim(),
    password : document.getElementById('nu-password').value,
    role     : document.getElementById('nu-role').value,
    badge    : document.getElementById('nu-badge').value.trim(),
  };
  if (!body.fullName || !body.username || !body.password || !body.badge) {
    alertEl.className = 'alert alert-danger show';
    alertEl.innerHTML = '⚠️ All fields required.';
    return;
  }
  try {
    await api('POST', '/admin/users', body);
    closeModal('add-user-modal');
    toast('User created successfully!', 'success');
    loadUsers();
  } catch(e) {
    alertEl.className = 'alert alert-danger show';
    alertEl.innerHTML = `❌ ${e.message}`;
  }
}

async function toggleUser(id, active) {
  try {
    await api('PATCH', `/admin/users/${id}/toggle`, { active });
    toast(`User ${active ? 'activated' : 'deactivated'}`, 'success');
    loadUsers();
  } catch(e) { toast(e.message,'error'); }
}

// ── Case Search ────────────────────────────────────────────────────────────────
document.getElementById('case-search-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchCase();
});

// ── Init ───────────────────────────────────────────────────────────────────────
initSidebar();
loadDashboard();
