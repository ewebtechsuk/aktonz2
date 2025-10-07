const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const { readContactEntries, updateContactEntries } = require('./account-storage.js');

const DATA_DIR = path.join(process.cwd(), 'data');
const DOCUMENTS_DIR = path.join(DATA_DIR, 'documents');
const STORE_NAME = 'documents.json';

function sanitiseFileName(name) {
  if (typeof name !== 'string') {
    return 'document';
  }
  const base = name.replace(/\\/g, '/').split('/').pop() || 'document';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function ensureDocumentsDir() {
  await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
}

function formatDocumentEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    fileName: entry.fileName,
    storedName: entry.storedName,
    mimeType: entry.mimeType,
    size: entry.size,
    uploadedAt: entry.uploadedAt,
    category: entry.category || null,
    note: entry.note || null,
  };
}

async function listDocuments(contactId) {
  const entries = await readContactEntries(STORE_NAME, contactId);
  return entries.map(formatDocumentEntry).filter(Boolean);
}

async function saveDocument(contactId, { originalName, mimeType, buffer, category = null, note = null }) {
  if (!contactId) {
    throw new Error('Contact ID is required');
  }
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new Error('File data is required');
  }

  await ensureDocumentsDir();

  const id = randomUUID();
  const safeName = sanitiseFileName(originalName);
  const extension = path.extname(safeName);
  const storedName = extension ? `${id}${extension}` : id;
  const filePath = path.join(DOCUMENTS_DIR, storedName);
  const uploadedAt = new Date().toISOString();

  await fs.writeFile(filePath, buffer);

  const entry = {
    id,
    fileName: safeName,
    storedName,
    mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'application/octet-stream',
    size: buffer.length,
    uploadedAt,
    category,
    note,
  };

  await updateContactEntries(STORE_NAME, contactId, (existing) => {
    const next = Array.isArray(existing) ? [entry, ...existing.filter((item) => item?.id !== id)] : [entry];
    return next;
  });

  return formatDocumentEntry(entry);
}

async function readDocumentFile(contactId, documentId) {
  if (!contactId || !documentId) {
    return null;
  }
  const entries = await readContactEntries(STORE_NAME, contactId);
  const entry = entries.find((item) => item?.id === documentId);
  if (!entry) {
    return null;
  }

  const filePath = path.join(DOCUMENTS_DIR, entry.storedName);
  try {
    const buffer = await fs.readFile(filePath);
    return { entry: formatDocumentEntry(entry), buffer };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function deleteDocument(contactId, documentId) {
  if (!contactId || !documentId) {
    return false;
  }

  let removedEntry = null;
  await updateContactEntries(STORE_NAME, contactId, (existing) => {
    if (!Array.isArray(existing)) {
      return [];
    }
    const next = [];
    for (const item of existing) {
      if (item?.id === documentId && !removedEntry) {
        removedEntry = item;
      } else if (item) {
        next.push(item);
      }
    }
    return next;
  });

  if (!removedEntry) {
    return false;
  }

  const filePath = path.join(DOCUMENTS_DIR, removedEntry.storedName);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (!(error && typeof error === 'object' && error.code === 'ENOENT')) {
      throw error;
    }
  }

  return true;
}

module.exports = {
  listDocuments,
  saveDocument,
  readDocumentFile,
  deleteDocument,
};
