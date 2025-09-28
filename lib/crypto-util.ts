import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

function normalizeBase64(value: string): string {
  return value.replace(/\s+/g, '').replace(/=+$/g, '');
}

function tryDecodeBase64Key(raw: string): Buffer | null {
  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 0) {
      return null;
    }

    const reencoded = decoded.toString('base64');
    if (normalizeBase64(reencoded) === normalizeBase64(raw)) {
      return decoded;
    }

    return null;
  } catch {
    return null;
  }
}

function deriveKey(): Buffer {
  const rawValue = process.env.TOKEN_ENCRYPTION_KEY;

  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }

  const trimmed = rawValue.trim();
  const decoded = tryDecodeBase64Key(trimmed);

  if (decoded && decoded.length === 32) {
    return decoded;
  }

  return createHash('sha256').update(trimmed).digest();
}

export function encryptText(plaintext: string): EncryptedPayload {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptText(payload: EncryptedPayload): string {
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = createDecipheriv(ALGORITHM, deriveKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

export function deserializeEncryptedPayload(serialized: string): EncryptedPayload {
  if (typeof serialized !== 'string') {
    throw new Error('Invalid encrypted payload');
  }

  try {
    const parsed = JSON.parse(serialized);

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.iv === 'string' &&
      typeof parsed.authTag === 'string' &&
      typeof parsed.ciphertext === 'string'
    ) {
      return {
        iv: parsed.iv,
        authTag: parsed.authTag,
        ciphertext: parsed.ciphertext,
      };
    }
  } catch {
    // Fall through to legacy parsing.
  }

  const legacyBuffer = Buffer.from(serialized, 'base64');

  if (legacyBuffer.length < IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES + 1) {
    throw new Error('Invalid encrypted payload');
  }

  const iv = legacyBuffer.subarray(0, IV_LENGTH_BYTES);
  const authTag = legacyBuffer.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const ciphertext = legacyBuffer.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}
