import { readFileSync } from 'node:fs';

export function loadJson(relativePath, importerUrl, defaultValue = null) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new TypeError('relativePath must be a non-empty string');
  }

  if (!importerUrl) {
    throw new TypeError('importerUrl is required when loading JSON');
  }

  try {
    const fileUrl = new URL(relativePath, importerUrl);
    const contents = readFileSync(fileUrl, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    console.error(
      `Failed to load JSON from ${relativePath} relative to ${importerUrl}.`,
      error,
    );
    return defaultValue;
  }
}
