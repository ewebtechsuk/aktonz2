'use strict';

const fs = require('fs');
const path = require('path');
const minimatch = require('minimatch');
const { defaults } = require('@istanbuljs/schema');
const isOutsideDir = require('./is-outside-dir');

const DOT_OPTIONS = { dot: true };

class TestExclude {
  constructor(opts = {}) {
    Object.assign(this, { relativePath: true }, defaults.testExclude);

    for (const [name, value] of Object.entries(opts)) {
      if (value !== undefined) {
        this[name] = value;
      }
    }

    if (typeof this.include === 'string') {
      this.include = [this.include];
    }

    if (typeof this.exclude === 'string') {
      this.exclude = [this.exclude];
    }

    if (typeof this.extension === 'string') {
      this.extension = [this.extension];
    } else if (this.extension.length === 0) {
      this.extension = false;
    }

    if (this.include && this.include.length > 0) {
      this.include = prepGlobPatterns([].concat(this.include));
    } else {
      this.include = false;
    }

    if (this.excludeNodeModules && !this.exclude.includes('**/node_modules/**')) {
      this.exclude = this.exclude.concat('**/node_modules/**');
    }

    this.exclude = prepGlobPatterns([].concat(this.exclude));

    this.handleNegation();
  }

  handleNegation() {
    const noNeg = entry => entry.charAt(0) !== '!';
    const onlyNeg = entry => entry.charAt(0) === '!';
    const stripNeg = entry => entry.slice(1);

    if (Array.isArray(this.include)) {
      const includeNegated = this.include.filter(onlyNeg).map(stripNeg);
      this.exclude.push(...prepGlobPatterns(includeNegated));
      this.include = this.include.filter(noNeg);
    }

    this.excludeNegated = this.exclude.filter(onlyNeg).map(stripNeg);
    this.exclude = this.exclude.filter(noNeg);
    this.excludeNegated = prepGlobPatterns(this.excludeNegated);
  }

  shouldInstrument(filename, relFile) {
    if (this.extension && !this.extension.some(ext => filename.endsWith(ext))) {
      return false;
    }

    let pathToCheck = filename;

    if (this.relativePath) {
      relFile = relFile || path.relative(this.cwd, filename);

      if (isOutsideDir(this.cwd, filename)) {
        return false;
      }

      pathToCheck = relFile.replace(/^\.[\\/]/, '');
    }

    const matches = pattern => minimatch(pathToCheck, pattern, DOT_OPTIONS);
    return (
      (!this.include || this.include.some(matches)) &&
      (!this.exclude.some(matches) || this.excludeNegated.some(matches))
    );
  }

  globSync(cwd = this.cwd) {
    const candidates = collectFiles(cwd, this.excludeNegated.length === 0 ? this.exclude : []);
    const extensionPattern = getExtensionPattern(this.extension || []);
    return candidates
      .filter(file => minimatch(file, extensionPattern, DOT_OPTIONS))
      .filter(file => this.shouldInstrument(path.resolve(cwd, file), file))
      .map(file => path.resolve(cwd, file));
  }

  async glob(cwd = this.cwd) {
    return this.globSync(cwd);
  }
}

function collectFiles(cwd, excludeDirectories) {
  const results = [];
  const stack = [''];

  while (stack.length > 0) {
    const relativeDir = stack.pop();
    const absoluteDir = path.join(cwd, relativeDir);
    let entries;
    try {
      entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDir.replace(/\\/g, '/'), entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipDir(relativePath, excludeDirectories)) {
          continue;
        }
        stack.push(relativePath);
        continue;
      }

      if (entry.isFile()) {
        results.push(relativePath);
      }
    }
  }

  return results;
}

function shouldSkipDir(relativePath, excludeDirectories) {
  if (excludeDirectories.length === 0) {
    return false;
  }
  const directoryPattern = relativePath.replace(/\\/g, '/') + '/**';
  return excludeDirectories.some(pattern => minimatch(directoryPattern, pattern, DOT_OPTIONS));
}

function prepGlobPatterns(patterns) {
  return patterns.reduce((result, pattern) => {
    if (!/\/\*\*$/.test(pattern)) {
      result = result.concat(pattern.replace(/\/$/, '') + '/**');
    }

    if (/^\*\*\//.test(pattern)) {
      result = result.concat(pattern.replace(/^\*\*\//, ''));
    }

    return result.concat(pattern);
  }, []);
}

function getExtensionPattern(extension) {
  switch (extension.length) {
    case 0:
      return '**';
    case 1:
      return `**/*${extension[0]}`;
    default:
      return `**/*{${extension.join()}}`;
  }
}

module.exports = TestExclude;
