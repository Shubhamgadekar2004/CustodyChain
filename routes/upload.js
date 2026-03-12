'use strict';

const express  = require('express');
const multer   = require('multer');
const crypto   = require('crypto');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const router   = express.Router();
const chain    = require('../blockchain/blockchain');
const { authenticate, requirePermission } = require('../middleware/auth');

// ── Upload directory ───────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer configuration – store with UUID filename ───────────────────────────
const storage = multer.diskStorage({
  destination : (req, file, cb) => cb(null, UPLOAD_DIR),
  filename    : (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

// Allowed MIME types by evidence type
const ALLOWED_MIME = {
  IMAGE_EVIDENCE : ['image/jpeg','image/png','image/gif','image/tiff','image/bmp','image/webp','image/heic','image/heif'],
  AUDIO_EVIDENCE : ['audio/mpeg','audio/wav','audio/ogg','audio/aac','audio/flac','audio/mp4','audio/x-m4a','audio/amr','audio/3gpp'],
  LOG_FILE       : ['text/plain','text/csv','application/json','application/xml','text/xml','text/html','application/octet-stream','application/gzip','application/zip'],
  VIDEO_EVIDENCE : ['video/mp4','video/x-msvideo','video/quicktime','video/x-matroska','video/webm','video/3gpp','video/mpeg','video/x-ms-wmv'],
  FORENSIC_REPORT: ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.oasis.opendocument.text','text/plain','application/zip'],
};

const upload = multer({
  storage,
  limits : { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (req, file, cb) => {
    const evType = req.body.type || req.query.type || '';
    const allowed = ALLOWED_MIME[evType];
    if (!allowed) return cb(null, true); // unknown type – allow, validate later
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type '${file.mimetype}' not allowed for evidence type '${evType}'`));
  },
});

// ── Compute SHA-256 hash of uploaded file ─────────────────────────────────────
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// ── POST /api/upload/submit ────────────────────────────────────────────────────
// multipart/form-data: type, caseNumber, exhibitMarkedAs, metadata (JSON string), file
router.post(
  '/submit',
  authenticate,
  requirePermission('SUBMIT_EVIDENCE'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { type, caseNumber, exhibitMarkedAs } = req.body;
      let formData = {};
      try { formData = JSON.parse(req.body.metadata || '{}'); } catch (_) {}

      const VALID_TYPES = ['IMAGE_EVIDENCE','AUDIO_EVIDENCE','LOG_FILE','VIDEO_EVIDENCE','FORENSIC_REPORT'];
      if (!VALID_TYPES.includes(type))
        return res.status(400).json({ error: `Invalid type for file upload: ${type}` });

      if (!caseNumber || !exhibitMarkedAs)
        return res.status(400).json({ error: 'caseNumber and exhibitMarkedAs are required' });

      let fileInfo = null;
      if (req.file) {
        const fileHash = await hashFile(req.file.path);
        fileInfo = {
          originalName : req.file.originalname,
          storedName   : req.file.filename,
          mimeType     : req.file.mimetype,
          sizeBytes    : req.file.size,
          sizeFormatted: formatBytes(req.file.size),
          sha256       : fileHash,
          uploadedAt   : new Date().toISOString(),
        };
        // Rename stored file to include hash prefix for integrity tracking
        const newPath = path.join(UPLOAD_DIR, `${fileHash.substring(0,12)}_${req.file.filename}`);
        fs.renameSync(req.file.path, newPath);
        fileInfo.storedPath = path.basename(newPath);
      }

      const exhibitId   = `EX-${uuidv4().split('-')[0].toUpperCase()}`;
      const submittedAt = new Date().toISOString();

      const evidenceData = {
        type,
        caseNumber,
        exhibitMarkedAs,
        exhibitId,
        formData,
        fileInfo,
        submittedBy     : req.user.username,
        submittedByRole : req.user.role,
        submittedByBadge: req.user.badge,
        submittedAt,
        ipAddress       : req.ip,
        status          : 'SUBMITTED',
      };

      const block = chain.addEvidenceBlock(evidenceData, req.user.username);
      block.addTransaction({
        action : 'INITIAL_FILE_SUBMISSION',
        actor  : req.user.username,
        role   : req.user.role,
        badge  : req.user.badge,
        note   : fileInfo
          ? `File submitted: ${fileInfo.originalName} (SHA-256: ${fileInfo.sha256.substring(0,16)}…)`
          : 'Metadata-only submission (no file)',
      });
      chain._persist();

      res.status(201).json({
        success     : true,
        message     : 'File evidence registered on blockchain',
        exhibitId,
        blockIndex  : block.index,
        blockId     : block.blockId,
        blockHash   : block.hash,
        fileHash    : fileInfo ? fileInfo.sha256 : null,
        fileInfo,
        submittedAt,
      });
    } catch (err) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/upload/download/:blockId ─────────────────────────────────────────
router.get('/download/:blockId', authenticate, (req, res) => {
  try {
    const block = chain.chain.find(b => b.blockId === req.params.blockId);
    if (!block) return res.status(404).json({ error: 'Block not found' });
    const fi = block.evidenceData.fileInfo;
    if (!fi) return res.status(404).json({ error: 'No file attached to this block' });

    const filePath = path.join(UPLOAD_DIR, fi.storedPath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server' });

    // Integrity check before serving
    const currentHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    if (currentHash !== fi.sha256) {
      chain._audit({ action: 'FILE_INTEGRITY_FAIL', blockId: req.params.blockId, expected: fi.sha256, got: currentHash });
      return res.status(409).json({ error: 'FILE INTEGRITY COMPROMISED – hash mismatch detected!' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${fi.originalName}"`);
    res.setHeader('Content-Type', fi.mimeType);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
