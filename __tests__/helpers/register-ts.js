const Module = require('module');
const { readFileSync } = require('fs');
const { transpileModule, ModuleKind, ScriptTarget, JsxEmit } = require('typescript');

const globalSymbol = Symbol.for('aktonz2.register-ts');

if (!global[globalSymbol]) {
  const originalTs = Module._extensions['.ts'];
  const originalTsx = Module._extensions['.tsx'];

  const compile = (module, filename) => {
    const source = readFileSync(filename, 'utf8');

    const { outputText } = transpileModule(source, {
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

    module._compile(outputText, filename);
  };

  Module._extensions['.ts'] = (module, filename) => {
    compile(module, filename);
  };

  Module._extensions['.tsx'] = (module, filename) => {
    compile(module, filename);
  };

  global[globalSymbol] = () => {
    Module._extensions['.ts'] = originalTs;
    Module._extensions['.tsx'] = originalTsx;
    global[globalSymbol] = null;
  };
}

module.exports = () => {
  const reset = global[globalSymbol];
  return typeof reset === 'function' ? reset : undefined;
};
