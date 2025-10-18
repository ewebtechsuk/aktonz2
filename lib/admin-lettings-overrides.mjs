import { readFile, writeFile } from 'node:fs/promises';

const STORE_PATH = new URL('../data/admin-lettings-overrides.json', import.meta.url);

let overridesCache = new Map();
let overridesLoaded = false;
let inflightLoad = null;
let inflightWrite = Promise.resolve();

async function loadOverridesFromDisk() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      overridesCache = new Map();
      return overridesCache;
    }

    const entries = Object.entries(parsed).filter(([key, value]) => key && value && typeof value === 'object');
    overridesCache = new Map(entries.map(([key, value]) => [String(key), value]));
    return overridesCache;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      overridesCache = new Map();
      return overridesCache;
    }

    console.warn('Failed to read lettings overrides store', error);
    overridesCache = new Map();
    return overridesCache;
  }
}

async function ensureOverridesLoaded() {
  if (overridesLoaded) {
    return overridesCache;
  }

  if (!inflightLoad) {
    inflightLoad = loadOverridesFromDisk()
      .then((map) => {
        overridesLoaded = true;
        inflightLoad = null;
        return map;
      })
      .catch((error) => {
        overridesLoaded = true;
        inflightLoad = null;
        throw error;
      });
  }

  return inflightLoad;
}

function mapToObject(map) {
  const result = {};
  for (const [key, value] of map.entries()) {
    result[key] = value;
  }
  return result;
}

async function persistOverrides() {
  const payload = JSON.stringify(mapToObject(overridesCache), null, 2);
  await writeFile(STORE_PATH, `${payload}\n`, 'utf8');
}

export async function getLettingsOverrides() {
  await ensureOverridesLoaded();
  return overridesCache;
}

export async function getLettingsOverrideById(id) {
  if (!id) {
    return null;
  }
  const map = await getLettingsOverrides();
  return map.get(String(id)) || null;
}

export async function setLettingsOverride(id, override) {
  if (!id) {
    throw new Error('Listing id is required to store overrides');
  }

  await ensureOverridesLoaded();

  const listingId = String(id);
  if (!override || (typeof override === 'object' && !Object.keys(override).length)) {
    overridesCache.delete(listingId);
  } else {
    overridesCache.set(listingId, override);
  }

  inflightWrite = inflightWrite.then(() => persistOverrides());

  try {
    await inflightWrite;
  } catch (error) {
    console.error('Failed to persist lettings overrides', error);
    inflightWrite = Promise.resolve();
    throw error;
  }

  return overridesCache.get(listingId) || null;
}

export async function resetLettingsOverridesCache() {
  overridesLoaded = false;
  overridesCache = new Map();
  inflightLoad = null;
  inflightWrite = Promise.resolve();
}

