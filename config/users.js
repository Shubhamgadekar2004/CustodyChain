'use strict';

// ── Pre-seeded users (production: replace with DB) ────────────────────────────
// Passwords hashed with bcrypt rounds=10
// Plain-text originals shown in comments – CHANGE IN PRODUCTION
const bcrypt = require('bcryptjs');

const USERS = [
  {
    id      : 'u-001',
    username: 'admin',
    // password: Admin@1234
    passwordHash: '$2a$10$2TpIXtScai0Q32AeCgur3.vcuX1CKOB4e0WPUYLLJccqq3S7juC3q',
    role    : 'ADMIN',
    fullName: 'Shubham Gadekar',
    badge   : 'ADM-001',
    active  : true,
  },
  {
    id      : 'u-002',
    username: 'io_officer',
    // password: IO@secur3
    passwordHash: '$2a$10$08TK9dK83rvG13a.DJo.Huj3gg3hErXODIDy9vPwc0CFTjkLNrvP6',
    role    : 'IO',
    fullName: 'Inspector Ramesh Kumar',
    badge   : 'IO-4421',
    active  : true,
  },
  {
    id      : 'u-003',
    username: 'forensic1',
    // password: Fore@nsic9
    passwordHash: '$2a$10$qmLVe5lnnct0QGSoP7KjBevMhL4EUsr1RH5DwHmwQSVC6ilH5HSfy',
    role    : 'FORENSIC_EXPERT',
    fullName: 'Dr. Priya Sharma',
    badge   : 'FE-0087',
    active  : true,
  },
  {
    id      : 'u-004',
    username: 'supervisor',
    // password: Sup@rvis0r
    passwordHash: '$2a$10$qjNLNE3P/4S5wv4EaHlb0OnBNrVX07LyZy18xC3fUXpoMkx318fKu',
    role    : 'SUPERVISOR',
    fullName: 'DCP Anil Mehta',
    badge   : 'SUP-0011',
    active  : true,
  },
  {
    id      : 'u-005',
    username: 'legal1',
    // password: Legal@55
    passwordHash: '$2a$10$WMB4Tck7ZCgvBcHRzBNcfOkKOeU5uqZWEjrrhCMa90Ox9Po8UyWYy',
    role    : 'LEGAL_OFFICER',
    fullName: 'Adv. Sunita Rao',
    badge   : 'LO-0203',
    active  : true,
  },
];

// Permissions matrix: role → array of allowed actions
const PERMISSIONS = {
  ADMIN: [
    'VIEW_ALL_EVIDENCE',
    'SUBMIT_EVIDENCE',
    'APPROVE_EVIDENCE',
    'DELETE_EVIDENCE',
    'MANAGE_USERS',
    'VIEW_BLOCKCHAIN',
    'VALIDATE_CHAIN',
    'VIEW_AUDIT_LOG',
    'EXPORT_REPORT',
    'CHAIN_OF_CUSTODY',
    'SIGN_EVIDENCE',
  ],
  IO: [
    'SUBMIT_EVIDENCE',
    'VIEW_OWN_EVIDENCE',
    'VIEW_CASE_EVIDENCE',
    'CHAIN_OF_CUSTODY',
    'EXPORT_REPORT',
  ],
  FORENSIC_EXPERT: [
    'VIEW_ALL_EVIDENCE',
    'SIGN_EVIDENCE',
    'ADD_FORENSIC_NOTES',
    'VIEW_BLOCKCHAIN',
    'CHAIN_OF_CUSTODY',
    'EXPORT_REPORT',
    'VALIDATE_CHAIN',
  ],
  SUPERVISOR: [
    'VIEW_ALL_EVIDENCE',
    'APPROVE_EVIDENCE',
    'VIEW_BLOCKCHAIN',
    'VIEW_AUDIT_LOG',
    'EXPORT_REPORT',
    'CHAIN_OF_CUSTODY',
  ],
  LEGAL_OFFICER: [
    'VIEW_ALL_EVIDENCE',
    'VIEW_BLOCKCHAIN',
    'EXPORT_REPORT',
  ],
};

function findUser(username) {
  return USERS.find(u => u.username === username && u.active);
}

function findById(id) {
  return USERS.find(u => u.id === id && u.active);
}

function hasPermission(role, action) {
  return (PERMISSIONS[role] || []).includes(action);
}

function getAllUsers() {
  return USERS.map(({ passwordHash, ...rest }) => rest);
}

function addUser(userData) {
  const hash = bcrypt.hashSync(userData.password, 10);
  const newUser = {
    id           : `u-${String(USERS.length + 1).padStart(3, '0')}`,
    username     : userData.username,
    passwordHash : hash,
    role         : userData.role,
    fullName     : userData.fullName,
    badge        : userData.badge,
    active       : true,
  };
  USERS.push(newUser);
  return { ...newUser, passwordHash: undefined };
}

function toggleUserActive(id, active) {
  const user = USERS.find(u => u.id === id);
  if (!user) return null;
  user.active = active;
  return { ...user, passwordHash: undefined };
}

module.exports = { findUser, findById, hasPermission, getAllUsers, addUser, toggleUserActive, PERMISSIONS };
