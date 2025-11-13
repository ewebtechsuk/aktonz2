import fs from 'node:fs';
import path from 'node:path';

export function loadJson(relativePath, defaultValue = null) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new TypeError('relativePath must be a non-empty string');
  }

  const targetPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(process.cwd(), relativePath);

  try {
    const contents = fs.readFileSync(targetPath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    console.error(`Failed to load JSON from ${targetPath}`, error);
    return defaultValue;
  }
}
