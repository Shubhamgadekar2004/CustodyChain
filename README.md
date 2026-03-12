# CustodyChain – Immutable Digital Evidence Management Platform


## System Architecture

```
  Browser (Login / Dashboard / 8 Evidence Forms)
       │  JWT Bearer token on every request
       ▼
  ┌─────────────────────────────────────────────────────┐
  │  Express API  (Helmet · CORS · Rate-Limiter)        │
  │                                                     │
  │  /api/auth      – login + token refresh             │
  │  /api/evidence  – submit / approve / sign / custody │
  │  /api/upload    – file ingestion (multer)           │
  │  /api/blockchain– explorer + admin + validate       │
  └────────────────────────┬────────────────────────────┘
                           │
       ┌───────────────────▼──────────────────────┐
       │   CustodyChain Blockchain Engine          │
       │                                          │
       │  ① SHA-256 PoW  – mines each block       │
       │  ② Merkle Tree  – custody transactions   │
       │  ③ VETARA Score – my original risk algo  │
       │  ④ Anomaly Detector – flags odd patterns │
       │  ⑤ Audit Log    – append-only trail      │
       │  ⑥ JSON persistence on local disk        │
       └──────────────────────────────────────────┘
```

---

## What Makes This Different

### My Original Algorithm — VETARA Score
Every evidence block is assigned a **VETARA** (Verified Evidence Trust And Risk Assessment) score from 0–100 the moment it is mined.  
The score weighs five factors I designed after studying forensic data-integrity standards:

| Factor | Weight | Logic |
|--------|--------|-------|
| Hash chain continuity | 30 pts | broken link = 0 |
| Custody event depth | 20 pts | more audit steps = higher trust |
| Forensic signature present | 20 pts | expert sign-off raises score |
| Time-gap anomaly penalty | 15 pts | unusual submission windows deduct |
| Role-appropriateness | 15 pts | right officer for the evidence type |

No existing open-source evidence platform implements this kind of per-block risk scoring.

### Evidence Coverage — 8 Form Types
| Form | Code | Key Fields Captured |
|------|------|--------------------|
| 📱 Phone / Tablet / iPad | `PHONE_TAB_IPAD` | IMEI, SIM, SD, OS, imaging tool |
| 💻 Desktop / Laptop / Server | `DESKTOP_LAPTOP_SERVER` | BIOS, HDD serial, power state |
| 💾 External Storage | `EXTERNAL_STORAGE` | write-blocker, hash verification |
| 🖼️ Image File | `IMAGE_FILE` | source device, hash, metadata |
| 🎵 Audio File | `AUDIO_FILE` | duration, format, hash |
| 📄 Log File | `LOG_FILE` | log source, time range, hash |
| 🎬 Video File | `VIDEO_FILE` | resolution, codec, hash |
| 📑 Forensic Report | `FORENSIC_REPORT` | analyst name, findings, references |

### 5-Role Permission Matrix (RBAC)
I modelled the roles directly on how a real cyber-crimes unit operates:

| Role | Can Submit | Can Approve | Can Sign | Can Delete | Audit Access |
|------|:---:|:---:|:---:|:---:|:---:|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| IO (Investigating Officer) | ✅ | ❌ | ❌ | ❌ | ❌ |
| FORENSIC_EXPERT | ❌ | ❌ | ✅ | ❌ | ❌ |
| SUPERVISOR | ❌ | ✅ | ❌ | ❌ | ✅ |
| LEGAL_OFFICER | ❌ | ❌ | ❌ | ❌ | ❌ |

### Dashboard Features
- Cybersecurity dark-theme SPA (single-page app)
- Sidebar items dynamically shown/hidden based on JWT role
- Evidence table: inline Approve / Forensic-Sign / Custody-Transfer
- **Blockchain Explorer** — scroll through every mined block
- **Chain Integrity Validator** — one-click full-chain audit
- **VETARA Score** badge on every block card
- **Anomaly Alerts** — flags submissions outside normal hours or from unknown IPs
- Audit Log with live-reload
- User Management panel (Admin only)
- Printable evidence certificate with block hash + data fingerprint

---

## Getting It Running

**Requirements:** Node.js ≥ 18, npm ≥ 9

```bash
git clone <your-repo-url>
cd "EVIDANCE MANAGEMENT"
npm install
cp .env.example .env          # edit JWT_SECRET before production
npm start
# → http://localhost:3000
```

### Test Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin@1234` | System Administrator |
| `io_officer` | `IO@secur3` | Investigating Officer |
| `forensic1` | `Fore@nsic9` | Forensic Expert |
| `supervisor` | `Sup@rvis0r` | Supervisor |
| `legal1` | `Legal@55` | Legal (view-only) |

---

## Project Layout

```
EVIDANCE MANAGEMENT/
├── server.js              ← Express entry-point, security middleware
├── blockchain/
│   └── blockchain.js      ← CustodyChain engine (PoW, Merkle, VETARA, Anomaly)
├── config/
│   └── users.js           ← RBAC user store + permissions matrix
├── middleware/
│   └── auth.js            ← JWT verify + role-gate middleware
├── routes/
│   ├── auth.js            ← Login, /me
│   ├── evidence.js        ← Submit / approve / sign / custody
│   ├── upload.js          ← File ingestion (multer)
│   └── blockchain.js      ← Explorer, validator, admin
├── data/                  ← Auto-created
│   ├── chain.json         ← Persistent blockchain state
│   └── audit.log          ← Append-only tamper-evident log
├── public/
│   ├── index.html         ← Login SPA
│   ├── dashboard.html     ← Main portal
│   ├── css/style.css
│   └── js/dashboard.js
└── FORMS/                 ← 8 standalone evidence form pages
    ├── phone-form.html
    ├── desktop-form.html
    ├── storage-form.html
    ├── image-form.html
    ├── audio-form.html
    ├── video-form.html
    ├── logfile-form.html
    └── forensic-report-form.html
```

---

## API Reference

```
POST  /api/auth/login                    { username, password } → JWT
GET   /api/auth/me

POST  /api/evidence/submit               Register evidence on chain
GET   /api/evidence/all                  All blocks (VIEW_ALL_EVIDENCE)
GET   /api/evidence/my                   Submitter's own evidence
GET   /api/evidence/case/:caseNumber
GET   /api/evidence/exhibit/:exhibitId
POST  /api/evidence/approve/:blockId     Mark approved  (SUPERVISOR)
POST  /api/evidence/sign/:blockId        Forensic sign  (FORENSIC_EXPERT)
POST  /api/evidence/custody/:blockId     Custody event  (IO / ADMIN)
GET   /api/evidence/stats

GET   /api/blockchain/chain
GET   /api/blockchain/validate           Runs full chain integrity check
GET   /api/blockchain/block/hash/:hash
GET   /api/blockchain/audit

GET   /api/admin/users
POST  /api/admin/users
PATCH /api/admin/users/:id/toggle
```

---

## Security Layers

| Layer | Mechanism |
|-------|----------|
| Transport auth | JWT HS256 · 8-hour expiry · CustodyChain-NFSU issuer claim |
| Login protection | bcrypt (10 rounds) + rate-limit 20 req/15 min |
| API protection | helmet headers + rate-limit 200 req/min |
| Evidence integrity | SHA-256 fingerprint of every form payload |
| Block immutability | PoW + nonce + Merkle root all baked into block hash |
| Tamper detection | Full chain re-validation on every `/validate` call |
| Audit trail | Append-only structured log; never updated, only appended |
| VETARA alerts | Anomalous submissions flagged automatically |

## Printable Evidence Certificate

Every form has a **Print Form** button that embeds:
- Exhibit ID (e.g. `EX-A3F1C2`)
- Block hash (SHA-256, 64 chars)
- SHA-256 data fingerprint
- Submission timestamp (ISO-8601)

The printed certificate can be independently re-verified against the live chain.

## Future Roadmap

- Migrate `chain.json` persistence to a write-once object store (e.g. IPFS)
- Add Ed25519 digital signatures per officer (currently using HMAC-SHA256)
- Distributed mode via libp2p peer network
- Mobile evidence collection app (React Native) that syncs to CustodyChain

---

---

**Author:** Shubham Gadekar  
**Institute:** National Forensic Sciences University, Goa Campus (NFSU Goa)  

*CustodyChain — Built for the hackathon; designed for the real world.*
