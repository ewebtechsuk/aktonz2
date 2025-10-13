#!/usr/bin/env node
import { access, constants } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brochurePdfBase64 } from '../data/aktonz-lettings-brochure-inline.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const publicBrochurePath = resolve(projectRoot, 'public', 'brochures', 'aktonz-lettings-brochure.pdf');
const docsBrochurePath = resolve(projectRoot, 'docs', 'aktonz-lettings-brochure.pdf');

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeBrochureFromBase64(targetPath) {
  const buffer = Buffer.from(brochurePdfBase64, 'base64');
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, buffer);
  return buffer;
}

async function ensureBrochure() {
  if (await fileExists(publicBrochurePath)) {
    return;
  }

  const hasPython = await new Promise((resolve) => {
    const probe = spawn('python', ['--version'], { stdio: 'ignore' });
    probe.once('error', () => resolve(false));
    probe.once('exit', (code) => resolve(code === 0));
  });

  if (hasPython) {
    const generated = await new Promise((resolve) => {
      const child = spawn('python', ['scripts/create_aktonz_lettings_brochure.py'], {
        cwd: projectRoot,
        stdio: 'ignore',
      });
      child.once('error', () => resolve(false));
      child.once('exit', (code) => resolve(code === 0));
    });

    if (generated && (await fileExists(publicBrochurePath))) {
      return;
    }
  }

  const buffer = await writeBrochureFromBase64(publicBrochurePath);
  if (!(await fileExists(docsBrochurePath))) {
    await writeBrochureFromBase64(docsBrochurePath);
  }
  return buffer;
}

ensureBrochure().catch((error) => {
  console.warn('Failed to ensure lettings brochure is available:', error);
});
