import crypto from 'node:crypto';

import adminUsers from '../data/admin-users.json' with { type: 'json' };

function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeEmail(value) {
  return sanitizeString(value).toLowerCase();
}

function deriveNameParts(entry) {
  const firstName = sanitizeString(entry.firstName);
  const lastName = sanitizeString(entry.lastName);

  if (firstName || lastName) {
    return {
      firstName: firstName || (lastName ? 'Admin' : ''),
      lastName: lastName || '',
    };
  }

  const name = sanitizeString(entry.name);
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    if (parts.length > 1) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
      };
    }
  }

  const email = normalizeEmail(entry.email);
  if (email) {
    const localPart = email.split('@')[0] || '';
    if (localPart) {
      return {
        firstName: localPart.charAt(0).toUpperCase() + localPart.slice(1),
        lastName: '',
      };
    }
  }

  return { firstName: 'Admin', lastName: '' };
}

function normalizeAdminUser(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const id = sanitizeString(entry.id);
  const email = normalizeEmail(entry.email);
  const passwordHash = sanitizeString(entry.passwordHash);

  if (!id || !email || !passwordHash) {
    return null;
  }

  const { firstName, lastName } = deriveNameParts(entry);
  const name = sanitizeString(entry.name) || `${firstName}${lastName ? ` ${lastName}` : ''}`;

  return {
    id,
    email,
    firstName,
    lastName,
    name,
    passwordHash,
  };
}

const NORMALISED_ADMINS = Array.isArray(adminUsers)
  ? adminUsers.map(normalizeAdminUser).filter(Boolean)
  : [];

const ADMINS_BY_EMAIL = new Map(NORMALISED_ADMINS.map((admin) => [admin.email, admin]));
const ADMINS_BY_ID = new Map(NORMALISED_ADMINS.map((admin) => [admin.id, admin]));

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function buildAdminProfile(admin) {
  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    contactId: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    name: admin.name,
    role: 'admin',
  };
}

export function authenticateAdmin({ email, password }) {
  const normalisedEmail = normalizeEmail(email);
  const admin = ADMINS_BY_EMAIL.get(normalisedEmail);

  if (!admin || typeof password !== 'string' || password.length === 0) {
    return null;
  }

  const hashedPassword = hashPassword(password);
  const hashedBuffer = Buffer.from(hashedPassword);
  const storedBuffer = Buffer.from(admin.passwordHash);

  if (hashedBuffer.length !== storedBuffer.length) {
    return null;
  }

  if (crypto.timingSafeEqual(hashedBuffer, storedBuffer)) {
    return buildAdminProfile(admin);
  }

  return null;
}

export function getAdminProfileById(id) {
  const normalisedId = sanitizeString(id);
  const admin = ADMINS_BY_ID.get(normalisedId) || null;
  return buildAdminProfile(admin);
}

export function isAdminSession(session) {
  return Boolean(session && typeof session.adminId === 'string' && session.adminId && session.role === 'admin');
}

export function getAdminFromSession(session) {
  if (!isAdminSession(session)) {
    return null;
  }

  return getAdminProfileById(session.adminId);
}

export function createAdminSessionPayload(adminProfile) {
  if (!adminProfile) {
    return null;
  }

  return {
    adminId: adminProfile.id,
    role: 'admin',
    email: adminProfile.email,
  };
}

export function listAdminUsers() {
  return NORMALISED_ADMINS.map((admin) => buildAdminProfile(admin));
}
