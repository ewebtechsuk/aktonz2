import { createRequire } from 'node:module';
import path from 'node:path';

const projectRequire = createRequire(path.join(process.cwd(), 'package.json'));

export function loadJson(relativePath, defaultValue = null) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new TypeError('relativePath must be a non-empty string');
  }

  const normalizedPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;

  try {
    return projectRequire(normalizedPath);
  } catch (error) {
    console.error(
      `Failed to load JSON from ${relativePath} using project root resolution.`,
      error,
    );
    return defaultValue;
  }
}
