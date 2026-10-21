const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Load the internal Node route with Prisma stubbed so an unauthorised request
// that touched the database would fail the test instead of opening a connection.
let dbCalls = 0;
const prismaStub = new Proxy({}, {
  get() {
    return new Proxy({}, { get() { return async () => { dbCalls += 1; throw new Error('database must not be reached'); }; } });
  },
});
const stubs = {
  '@/lib/prisma': { __esModule: true, default: prismaStub },
  '@prisma/client': { ContentCategory: {}, TrackingStatus: {}, RatingScale: {}, Prisma: {} },
  // Analytics is covered by tracking-analytics.test.cjs; a no-op here.
  '@/lib/analytics': { track: async () => {} },
};
const routePath = path.resolve(__dirname, '../src/app/api/internal/tracking/route.ts');
const compiled = ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const routeModule = new Module(routePath, module);
routeModule.filename = routePath;
routeModule.paths = Module._nodeModulePaths(path.dirname(routePath));
const realRequire = routeModule.require.bind(routeModule);
routeModule.require = (id) => (id in stubs ? stubs[id] : realRequire(id));
routeModule._compile(compiled, routePath);
const route = routeModule.exports;
const originalSecret = process.env.INTERNAL_API_SECRET;

afterEach(() => {
  dbCalls = 0;
  if (originalSecret === undefined) delete process.env.INTERNAL_API_SECRET;
  else process.env.INTERNAL_API_SECRET = originalSecret;
});

for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
  for (const [name, headers] of [
    ['without the secret', {}],
    ['with a wrong secret', { 'x-internal-secret': 'wrong' }],
  ]) {
    test(`direct internal ${method} ${name} is refused with 401`, async () => {
      process.env.INTERNAL_API_SECRET = 'test-only-internal-secret';
      const response = await route[method](new NextRequest(
        'http://localhost/api/internal/tracking?userId=user-b&itemId=x',
        { method, headers },
      ));
      assert.equal(response.status, 401);
      assert.equal(dbCalls, 0);
    });
  }
}

test('an unset INTERNAL_API_SECRET does not let an empty header through', async () => {
  delete process.env.INTERNAL_API_SECRET;
  const response = await route.GET(new NextRequest(
    'http://localhost/api/internal/tracking?userId=user-b',
    { headers: { 'x-internal-secret': '' } },
  ));
  assert.equal(response.status, 401);
  assert.equal(dbCalls, 0);
});
