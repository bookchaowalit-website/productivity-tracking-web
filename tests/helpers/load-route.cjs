const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

// Transpile a TypeScript route and load it with selected imports stubbed, so
// tests exercise the real handler without Next's bundler or a database.
// Extra compiler options (for example `jsx` for a .tsx component) are merged in.
function loadRoute(relativePath, stubs = {}, compilerOptions = {}) {
  const routePath = path.resolve(__dirname, '..', '..', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, ...compilerOptions,
    },
  }).outputText;
  const routeModule = new Module(routePath, module);
  routeModule.filename = routePath;
  routeModule.paths = Module._nodeModulePaths(path.dirname(routePath));
  const realRequire = routeModule.require.bind(routeModule);
  routeModule.require = (id) => (id in stubs ? stubs[id] : realRequire(id));
  routeModule._compile(compiled, routePath);
  return { routePath, route: routeModule.exports };
}

module.exports = { loadRoute };
