const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(process.cwd(), 'data');

function normaliseStore(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
}

async function readStoreFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return normaliseStore(parsed);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeStoreFile(filePath, store) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2));
}

async function readContactEntries(fileName, contactId) {
  if (!contactId) {
    return [];
  }
  const filePath = path.join(DATA_DIR, fileName);
  const store = await readStoreFile(filePath);
  const entries = store[contactId];
  return Array.isArray(entries) ? entries : [];
}

async function writeContactEntries(fileName, contactId, entries) {
  const filePath = path.join(DATA_DIR, fileName);
  const store = await readStoreFile(filePath);
  const nextStore = { ...store };
  if (Array.isArray(entries) && entries.length > 0) {
    nextStore[contactId] = entries;
  } else {
    delete nextStore[contactId];
  }
  await writeStoreFile(filePath, nextStore);
}

async function updateContactEntries(fileName, contactId, updater) {
  if (typeof updater !== 'function') {
    throw new TypeError('updater must be a function');
  }
  const filePath = path.join(DATA_DIR, fileName);
  const store = await readStoreFile(filePath);
  const current = Array.isArray(store[contactId]) ? store[contactId] : [];
  const next = await updater([...current]);
  const nextStore = { ...store };
  if (Array.isArray(next) && next.length > 0) {
    nextStore[contactId] = next;
  } else {
    delete nextStore[contactId];
  }
  await writeStoreFile(filePath, nextStore);
  return next;
}

module.exports = {
  readContactEntries,
  writeContactEntries,
  updateContactEntries,
};
