const path = require('path');
const Module = require('module');
const { readFileSync } = require('fs');
const { pathToFileURL } = require('url');
const { transpileModule, ModuleKind, ScriptTarget, JsxEmit } = require('typescript');

module.exports = (relativePath, callerDir = __dirname, options = {}) => {
  const filename = path.resolve(callerDir, relativePath);
  const source = readFileSync(filename, 'utf8');

  const { overrides = {} } = options;

  let { outputText } = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ES2019,
      esModuleInterop: true,
      jsx: JsxEmit.React,
      resolveJsonModule: true,
      isolatedModules: true,
    },
    fileName: filename,
  });

  if (outputText.includes('import.meta')) {
    const shimDeclaration = `const importMetaShim = { url: ${JSON.stringify(
      pathToFileURL(filename).href
    )} };\n`;
    outputText = shimDeclaration + outputText.replace(/import\.meta/g, 'importMetaShim');
  }

  const parentModule = module;
  const compiledModule = new Module(filename, parentModule);
  compiledModule.filename = filename;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filename));

  const customRequire = (request) => {
    if (request in overrides) {
      return overrides[request];
    }

    const resolved = Module._resolveFilename(request, compiledModule);
    if (resolved in overrides) {
      return overrides[resolved];
    }

    return Module._load(resolved, compiledModule, false);
  };

  compiledModule.require = customRequire;
  compiledModule._compile(outputText, filename);
  return compiledModule.exports;
};

if (typeof describe === 'function') {
  describe('load-ts helper', () => {
    test('exposes a loader function', () => {
      expect(typeof module.exports).toBe('function');
    });
  });
}
