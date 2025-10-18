const path = require('path');
const Module = require('module');
const { readFileSync } = require('fs');
const { pathToFileURL } = require('url');
const babel = require('@babel/core');
const baseBabelConfig = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-typescript',
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
  ],
};

const TRANSPILABLE_EXTENSIONS = new Set(['.js', '.mjs', '.jsx', '.ts', '.tsx']);
const BUILTIN_MODULES = new Set(Module.builtinModules);

function shouldTranspile(filename) {
  if (!filename) {
    return false;
  }

  if (filename.startsWith('node:')) {
    return false;
  }

  if (filename.includes(`${path.sep}node_modules${path.sep}`)) {
    return false;
  }

  return TRANSPILABLE_EXTENSIONS.has(path.extname(filename));
}

function createJsonModule(filename, parentModule) {
  if (Module._cache[filename]) {
    return Module._cache[filename].exports;
  }

  const jsonModule = new Module(filename, parentModule);
  jsonModule.filename = filename;
  jsonModule.paths = Module._nodeModulePaths(path.dirname(filename));
  Module._cache[filename] = jsonModule;

  Module._extensions['.json'](jsonModule, filename);
  jsonModule.loaded = true;

  return jsonModule.exports;
}

function transformSource(filename, source) {
  if (!shouldTranspile(filename)) {
    return source;
  }

  const result = babel.transformSync(source, {
    ...baseBabelConfig,
    filename,
    configFile: false,
    babelrc: false,
    sourceMaps: 'inline',
  });

  return result && typeof result.code === 'string' ? result.code : source;
}

function compileModule(filename, parentModule, overrides, forceRecompile = false) {
  if (!forceRecompile && Module._cache[filename]) {
    return Module._cache[filename].exports;
  }

  if (forceRecompile && Module._cache[filename]) {
    delete Module._cache[filename];
  }

  const source = readFileSync(filename, 'utf8');

  let outputText = transformSource(filename, source);

  if (outputText.includes('import.meta')) {
    const shimDeclaration = `const importMetaShim = { url: ${JSON.stringify(
      pathToFileURL(filename).href
    )} };\n`;
    outputText = shimDeclaration + outputText.replace(/import\.meta/g, 'importMetaShim');
  }

  const compiledModule = new Module(filename, parentModule);
  compiledModule.filename = filename;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filename));

  Module._cache[filename] = compiledModule;

  compiledModule.require = createCustomRequire(compiledModule, overrides);
  compiledModule._compile(outputText, filename);

  return compiledModule.exports;
}

function createCustomRequire(parentModule, overrides) {
  return (request) => {
    if (request in overrides) {
      return overrides[request];
    }

    const resolved = Module._resolveFilename(request, parentModule);

    if (resolved in overrides) {
      return overrides[resolved];
    }

    if (resolved.startsWith('node:') || BUILTIN_MODULES.has(resolved) || BUILTIN_MODULES.has(request)) {
      return Module._load(resolved, parentModule, false);
    }

    if (resolved.endsWith('.json')) {
      return createJsonModule(resolved, parentModule);
    }

    if (shouldTranspile(resolved)) {
      return compileModule(resolved, parentModule, overrides);
    }

    return Module._load(resolved, parentModule, false);
  };
}

module.exports = (relativePath, callerDir = __dirname, options = {}) => {
  const filename = path.resolve(callerDir, relativePath);
  const { overrides = {} } = options;

  return compileModule(filename, module, overrides, true);
};

if (typeof describe === 'function') {
  describe('load-ts helper', () => {
    test('exposes a loader function', () => {
      expect(typeof module.exports).toBe('function');
    });
  });
}
