const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const { loadRoute } = require('./helpers/load-route.cjs');

// Browser analytics core (Big Loop W4 pilot): off unless the flag and a key are
// set, nothing before consent, allow-listed properties only. The adapter is a
// recorder, and fetch / sendBeacon / XMLHttpRequest are traps: a test fails if
// anything tries to leave the process.
const stubAdapterModule = { loadPostHog: async () => { throw new Error('real adapter must not load in tests'); } };
const { route: core } = loadRoute('src/lib/browser-analytics.ts', { './posthog-adapter': stubAdapterModule });

const ON = { enabled: 'true', key: 'phc_test_only', host: 'https://eu.i.posthog.com' };
let network;
const saved = {};

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    data,
  };
}

function recorder() {
  const calls = [];
  let loads = 0;
  const adapter = {
    track: (event, props) => calls.push(['track', event, props]),
    identify: (id) => calls.push(['identify', id]),
    page: (path) => calls.push(['page', path]),
    optOut: () => calls.push(['optOut']),
    reset: () => calls.push(['reset']),
  };
  return { calls, load: async () => { loads += 1; return adapter; }, loads: () => loads };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  network = [];
  for (const key of ['fetch', 'XMLHttpRequest', 'navigator']) saved[key] = Object.getOwnPropertyDescriptor(global, key);
  global.fetch = async (...args) => { network.push(['fetch', ...args]); return new Response('{}'); };
  global.XMLHttpRequest = function XMLHttpRequest() { network.push(['xhr']); };
  Object.defineProperty(global, 'navigator', {
    configurable: true, value: { sendBeacon: (...args) => { network.push(['beacon', ...args]); return true; } },
  });
});

afterEach(() => {
  for (const [key, descriptor] of Object.entries(saved)) {
    if (descriptor) Object.defineProperty(global, key, descriptor);
    else delete global[key];
  }
});

test('readConfig: on only when the flag is exactly "true" and a key is set', () => {
  assert.equal(core.readConfig({}), null);
  assert.equal(core.readConfig({ enabled: 'true' }), null);
  assert.equal(core.readConfig({ enabled: 'true', key: '   ' }), null);
  assert.equal(core.readConfig({ key: 'phc_x' }), null);
  for (const enabled of ['false', '1', 'TRUE', 'yes', ' true']) {
    assert.equal(core.readConfig({ enabled, key: 'phc_x' }), null, enabled);
  }
  assert.deepEqual(core.readConfig({ enabled: 'true', key: ' phc_x ' }), { key: 'phc_x', host: 'https://eu.i.posthog.com' });
  assert.deepEqual(core.readConfig({ ...ON, host: 'https://eu.example.test/' }), { key: 'phc_test_only', host: 'https://eu.example.test' });
});

test('flag off or no key: no adapter load and no network call, even after consent', async () => {
  for (const env of [{}, { enabled: 'false', key: 'phc_x' }, { enabled: 'true' }, { enabled: 'true', key: '' }]) {
    const r = recorder();
    const storage = memoryStorage({ [core.CONSENT_KEY]: 'granted' });
    const a = core.createAnalytics({ config: core.readConfig(env), load: r.load, storage });
    assert.equal(a.enabled, false);
    a.setConsent('granted');
    a.page('/');
    a.track('collection_filtered', { filter: 'search' });
    a.identify('clx0abcdef0000000000000000');
    a.reset();
    await flush();
    assert.equal(r.loads(), 0);
    assert.deepEqual(r.calls, []);
    assert.equal(storage.data.size, 1, 'nothing written to storage');
  }
  assert.deepEqual(network, []);
});

test('the default singleton is off in tests (no NEXT_PUBLIC_* set) and never loads PostHog', async () => {
  assert.equal(core.analytics.enabled, false);
  core.analytics.setConsent('granted');
  core.analytics.page('/');
  core.analytics.track('collection_filtered', { filter: 'status' });
  await flush();
  assert.deepEqual(network, []);
});

test('enabled but no consent yet: nothing loads, nothing is sent, nothing is queued', async () => {
  const r = recorder();
  const a = core.createAnalytics({ config: core.readConfig(ON), load: r.load, storage: memoryStorage() });
  assert.equal(a.enabled, true);
  assert.equal(a.consent(), 'unknown');
  a.page('/');
  a.track('collection_filtered', { filter: 'search' });
  a.identify('clx0abcdef0000000000000000');
  await flush();
  assert.equal(r.loads(), 0);
  a.setConsent('granted');
  await flush();
  assert.deepEqual(r.calls, [], 'events from before consent are dropped, not replayed');
  assert.deepEqual(network, []);
});

test('declined: nothing loads, and the choice is remembered', async () => {
  const r = recorder();
  const storage = memoryStorage();
  const a = core.createAnalytics({ config: core.readConfig(ON), load: r.load, storage });
  a.setConsent('denied');
  a.page('/');
  a.track('collection_filtered', { filter: 'search' });
  await flush();
  assert.equal(r.loads(), 0);
  assert.equal(storage.getItem(core.CONSENT_KEY), 'denied');
  const again = core.createAnalytics({ config: core.readConfig(ON), load: r.load, storage });
  assert.equal(again.consent(), 'denied');
});

test('granted: loads the adapter once and forwards clean calls', async () => {
  const r = recorder();
  const storage = memoryStorage();
  const a = core.createAnalytics({ config: core.readConfig(ON), load: r.load, storage });
  a.setConsent('granted');
  a.page('/');
  a.track('collection_filtered', { filter: 'category' });
  a.identify('clx0abcdef0000000000000000');
  await flush();
  assert.equal(r.loads(), 1);
  assert.equal(storage.getItem(core.CONSENT_KEY), 'granted');
  assert.deepEqual(r.calls, [
    ['page', '/'],
    ['track', 'collection_filtered', { filter: 'category', product: 'trackit' }],
    ['identify', 'clx0abcdef0000000000000000'],
  ]);
});

test('withdrawing consent opts out and stops sending', async () => {
  const r = recorder();
  const a = core.createAnalytics({ config: core.readConfig(ON), load: r.load, storage: memoryStorage() });
  a.setConsent('granted');
  a.page('/');
  await flush();
  a.setConsent('denied');
  await flush();
  a.track('collection_filtered', { filter: 'search' });
  await flush();
  assert.deepEqual(r.calls, [['page', '/'], ['optOut']]);
});

test('no PII in event properties: unknown keys, emails, URLs and free text are dropped', async () => {
  const r = recorder();
  const a = core.createAnalytics({ config: core.readConfig(ON), load: r.load, storage: memoryStorage() });
  a.setConsent('granted');
  a.track('collection_filtered', {
    filter: 'search', query: 'my private search', email: 'a@example.test', name: 'Book', url: 'https://x.test/?t=1',
  });
  a.track('collection_filtered', { filter: 'a@example.test' });
  a.track('collection_filtered', { filter: 'https://x.test/?token=abc' });
  a.track('collection_filtered', { filter: 'two words' });
  a.track('collection_filtered', { filter: 'not-a-known-filter' });
  a.track('unknown_event', { filter: 'search' });
  await flush();
  assert.deepEqual(r.calls, [['track', 'collection_filtered', { filter: 'search', product: 'trackit' }]]);
  assert.doesNotMatch(JSON.stringify(r.calls), /@|private|https?:|Book|token/);
});

test('identify accepts only a pseudonymous id, never an email or free text', async () => {
  const r = recorder();
  const a = core.createAnalytics({ config: core.readConfig(ON), load: r.load, storage: memoryStorage() });
  a.setConsent('granted');
  for (const id of ['a@example.test', 'Book Chaowalit', '', '  ', 'x'.repeat(200)]) a.identify(id);
  await flush();
  assert.deepEqual(r.calls, []);
});

test('page paths lose query strings, fragments and id-like segments', () => {
  const cases = {
    '/': '/',
    '/?q=secret&token=abc': '/',
    '/more-projects#top': '/more-projects',
    'https://bookchaowalit-tracking.vercel.app/items/123?x=1': '/items/:id',
    '/items/clx0abcdef0000000000000000/edit': '/items/:id/edit',
    '/u/550e8400-e29b-41d4-a716-446655440000': '/u/:id',
    '/u/a@example.test': '/u/:id',
    '/hash/deadbeefcafe1234': '/hash/:id',
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(core.sanitizePath(input), expected, input);
});

test('storage that throws (private mode) is treated as no choice made', () => {
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem() {} };
  const a = core.createAnalytics({ config: core.readConfig(ON), load: recorder().load, storage: broken });
  assert.equal(a.consent(), 'unknown');
  assert.doesNotThrow(() => a.setConsent('granted'));
  assert.equal(a.consent(), 'granted');
});

test('subscribers hear consent changes', () => {
  const a = core.createAnalytics({ config: core.readConfig(ON), load: recorder().load, storage: memoryStorage() });
  const heard = [];
  const off = a.subscribe((value) => heard.push(value));
  a.setConsent('granted');
  off();
  a.setConsent('denied');
  assert.deepEqual(heard, ['granted']);
});
