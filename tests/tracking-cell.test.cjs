const assert = require('node:assert/strict');
const { generateKeyPairSync, createVerify } = require('node:crypto');
const { afterEach, beforeEach, test } = require('node:test');
const { loadRoute } = require('./helpers/load-route.cjs');

// The tracking cell client (SPEC-003): identity client_credentials with a signed assertion, a cached
// token, one retry after a 401, every page of the list, and user-scoped paths.
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const ENV = {
  TRACKING_CLIENT_PRIVATE_KEY_PEM_B64: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64'),
  TRACKING_API_URL: 'https://gateway.test/v1/tracking',
  TRACKING_IDENTITY_ISSUER: 'https://identity.test',
  TRACKING_CLIENT_ID: 'tracking-web',
};
const saved = {};
const originalFetch = global.fetch;
let calls;
let cell;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) { saved[k] = process.env[k]; process.env[k] = v; }
  calls = [];
  cell = loadRoute('src/lib/tracking-cell.ts').route.trackingCell; // fresh module = empty token cache
});
afterEach(() => {
  global.fetch = originalFetch;
  for (const k of Object.keys(ENV)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
});

const verifyAssertion = (form) => {
  const assertion = form.get('client_assertion');
  const [h, c, s] = assertion.split('.');
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${h}.${c}`);
  assert.ok(verifier.verify(publicKey, Buffer.from(s, 'base64url')), 'assertion is signed with the client key');
  return JSON.parse(Buffer.from(c, 'base64url').toString());
};

test('gets a token once, then calls the user-scoped path with it', async () => {
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/v1/token')) return json(200, { access_token: 'tok-1', expires_in: 600 });
    return json(200, { items: [{ id: 'i1' }], next_cursor: null });
  };
  const first = await cell.list('user a/../b', {});
  const second = await cell.list('user-a', { category: 'BOOK', isFavorite: true });
  assert.equal(first.status, 200);
  assert.deepEqual(second.body, [{ id: 'i1' }]);
  const tokenCalls = calls.filter((c) => c.url.endsWith('/v1/token'));
  assert.equal(tokenCalls.length, 1, 'token is cached');
  const form = new URLSearchParams(tokenCalls[0].init.body.toString());
  assert.equal(form.get('grant_type'), 'client_credentials');
  assert.equal(form.get('audience'), 'tracking-api');
  const claims = verifyAssertion(form);
  assert.equal(claims.iss, 'tracking-web');
  assert.equal(claims.aud, 'https://identity.test/v1/token');
  const reads = calls.filter((c) => !c.url.endsWith('/v1/token'));
  assert.equal(reads[0].url, 'https://gateway.test/v1/tracking/v1/users/user%20a%2F..%2Fb/tracking');
  assert.equal(reads[1].url, 'https://gateway.test/v1/tracking/v1/users/user-a/tracking?category=BOOK&isFavorite=true');
  assert.equal(reads[1].init.headers.Authorization, 'Bearer tok-1');
});

test('follows next_cursor across pages', async () => {
  global.fetch = async (url) => {
    if (String(url).endsWith('/v1/token')) return json(200, { access_token: 'tok', expires_in: 600 });
    return String(url).includes('cursor=') ? json(200, { items: [{ id: 'b' }], next_cursor: null })
      : json(200, { items: [{ id: 'a' }], next_cursor: 'MTAw' });
  };
  assert.deepEqual((await cell.list('user-a', {})).body, [{ id: 'a' }, { id: 'b' }]);
});

test('a 401 refreshes the token once', async () => {
  let n = 0;
  global.fetch = async (url) => {
    if (String(url).endsWith('/v1/token')) { n += 1; return json(200, { access_token: `tok-${n}`, expires_in: 600 }); }
    return n === 1 ? json(401, { error: 'unauthenticated' }) : json(201, { id: 't1', meta: { source: 'new_item' } });
  };
  const response = await cell.add('user-a', { title: 'Dune', category: 'BOOK' });
  assert.equal(response.status, 201);
  assert.equal(n, 2);
});

test('a failed token request throws, so the route answers 500', async () => {
  global.fetch = async () => json(401, { error: 'invalid_client' });
  await assert.rejects(cell.remove('user-a', 'item-a'), /identity token request failed with 401/);
});

test('a missing client key is a configuration error', async () => {
  delete process.env.TRACKING_CLIENT_PRIVATE_KEY_PEM_B64;
  global.fetch = async () => json(200, {});
  await assert.rejects(cell.update('user-a', 'item-a', {}), /client key is not configured/);
});
