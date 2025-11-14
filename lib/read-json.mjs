import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export async function readJson(...segments) {
  const filePath = path.join(process.cwd(), ...segments);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export function readJsonSync(...segments) {
  const filePath = path.join(process.cwd(), ...segments);
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}
