#!/usr/bin/env node
const { spawn } = require('node:child_process');
const path = require('node:path');

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function expandPatternArg(arg) {
  if (!arg || arg.startsWith('-')) {
    return arg;
  }

  const alphaNumericOnly = /^[A-Za-z0-9]+$/.test(arg);
  const hasUppercase = /[A-Z]/.test(arg);

  if (!alphaNumericOnly || !hasUppercase) {
    return arg;
  }

  const kebab = toKebabCase(arg);
  if (kebab === arg.toLowerCase()) {
    return arg;
  }

  return `(${arg}|${kebab})`;
}

const userArgs = process.argv.slice(2);
const normalizedArgs = userArgs.map(expandPatternArg);

const jestPath = path.join(__dirname, '..', 'node_modules', 'jest', 'bin', 'jest.js');

const child = spawn(
  process.execPath,
  ['--experimental-vm-modules', jestPath, ...normalizedArgs],
  { stdio: 'inherit', env: process.env }
);

child.on('close', (code) => {
  process.exit(code);
});

