const assert = require('node:assert/strict');
const { afterEach, beforeEach, mock, test } = require('node:test');
const { loadRoute } = require('./helpers/load-route.cjs');

// Unit tests for the server-side analytics wrapper (SPEC-001 AC-01…AC-04).
// `fetch` is replaced by a recorder; nothing leaves the process.
const { route: analytics } = loadRoute('src/lib/analytics.ts');

const ENV_KEYS = ['POSTHOG_PROJECT_KEY', 'POSTHOG_HOST', 'POSTHOG_TIMEOUT_MS'];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = global.fetch;
let requests;
let warnings;

beforeEach(() => {
  requests = [];
  warnings = [];
  for (const key of ENV_KEYS) delete process.env[key];
  global.fetch = async (url, init) => {
    requests.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response('{"status":"Ok"}', { status: 200 });
  };
  mock.method(console, 'warn', (...args) => { warnings.push(args); });
});

afterEach(() => {
  global.fetch = originalFetch;
  mock.restoreAll();
  mock.timers.reset();
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test('no key: no request (AC-01)', async () => {
  await analytics.track('tracking_item_added', 'user-a', { category: 'ANIME' });
  process.env.POSTHOG_PROJECT_KEY = '   ';
  await analytics.track('tracking_item_added', 'user-a', { category: 'ANIME' });
  assert.equal(requests.length, 0);
  assert.equal(warnings.length, 0);
});

test('sends allow-listed event (AC-02)', async () => {
  process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
  await analytics.track('tracking_item_added', 'user-a', { category: 'ANIME', source: 'new_item', status: 'WATCHING' });

  assert.equal(requests.length, 1);
  const [request] = requests;
  assert.equal(request.url, 'https://eu.i.posthog.com/i/v0/e/');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(Object.keys(request.body).sort(), ['api_key', 'distinct_id', 'event', 'properties', 'timestamp']);
  assert.equal(request.body.api_key, 'phc_test_only');
  assert.equal(request.body.event, 'tracking_item_added');
  assert.equal(request.body.distinct_id, 'user-a');
  assert.ok(!Number.isNaN(Date.parse(request.body.timestamp)));
  assert.equal(new Date(request.body.timestamp).toISOString(), request.body.timestamp);
  assert.deepEqual(request.body.properties, {
    product: 'trackit',
    $ip: null,
    $geoip_disable: true,
    category: 'ANIME',
    source: 'new_item',
    status: 'WATCHING',
  });
});

test('POSTHOG_HOST overrides the default host (AC-02)', async () => {
  process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
  process.env.POSTHOG_HOST = 'https://ingest.example.test/';
  await analytics.track('tracking_item_removed', 'user-a', { category: 'BOOK' });
  assert.equal(requests[0].url, 'https://ingest.example.test/i/v0/e/');
});

test('drops unknown properties and events (AC-03)', async () => {
  process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
  await analytics.track('tracking_item_added', 'user-a', {
    category: 'ANIME', title: 'Private title', email: 'a@example.test', notes: 'secret', url: 'https://x.test', error: 'boom',
  });
  await analytics.track('page_viewed', 'user-a', { category: 'ANIME' });
  await analytics.track('constructor', 'user-a', {});
  await analytics.track('tracking_item_added', '', { category: 'ANIME' });

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.properties, { product: 'trackit', $ip: null, $geoip_disable: true, category: 'ANIME' });
});

test('caller cannot override the fixed properties (AC-02, AC-03)', async () => {
  process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
  await analytics.track('tracking_write_failed', 'user-a', { method: 'PUT', status_code: 404, product: 'other', $ip: '1.2.3.4' });
  assert.deepEqual(requests[0].body.properties, {
    product: 'trackit', $ip: null, $geoip_disable: true, method: 'PUT', status_code: 404,
  });
});

for (const [name, fetchImpl] of [
  ['rejected request', async () => { throw new Error('network down'); }],
  ['5xx response', async () => new Response('busy', { status: 503 })],
]) {
  test(`failure is swallowed: ${name} (AC-04)`, async () => {
    process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
    global.fetch = fetchImpl;
    await assert.doesNotReject(analytics.track('tracking_item_added', 'user-a', { category: 'ANIME', title: 'Private title' }));
    assert.equal(warnings.length, 1);
    assert.doesNotMatch(JSON.stringify(warnings[0]), /Private title|phc_test_only|user-a/);
  });
}

test('failure is swallowed: timeout (AC-04)', async () => {
  process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
  process.env.POSTHOG_TIMEOUT_MS = '50';
  mock.timers.enable({ apis: ['setTimeout'] });
  let aborted = false;
  global.fetch = (url, init) => new Promise(() => { init.signal.addEventListener('abort', () => { aborted = true; }); });

  const pending = analytics.track('tracking_updated', 'user-a', { fields_changed: ['status'], status: 'DROPPED' });
  mock.timers.tick(50);
  await assert.doesNotReject(pending);
  assert.equal(aborted, true);
  assert.equal(warnings.length, 1);
});
