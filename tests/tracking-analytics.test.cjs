const assert = require('node:assert/strict');
const { afterEach, beforeEach, mock, test } = require('node:test');
const { NextRequest } = require('next/server');
const { loadRoute } = require('./helpers/load-route.cjs');

// Analytics events from the internal tracking route (SPEC-001 AC-04…AC-09).
// The route runs against an in-memory Prisma fixture; `@/lib/analytics` is a
// recorder, except in the AC-04 test, which loads the real wrapper with a
// failing `fetch`.
const enumOf = (...values) => Object.fromEntries(values.map((value) => [value, value]));
const prismaClientStub = {
  ContentCategory: enumOf('ANIME', 'MANGA', 'MOVIE', 'TV_SHOW', 'BOOK', 'WEBSITE', 'PODCAST', 'GAME', 'OTHER'),
  TrackingStatus: enumOf('PLAN_TO_WATCH', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'),
  RatingScale: enumOf('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'),
  Prisma: {},
};

let db;
let failNext;
const resetDb = () => {
  db = {
    users: ['user-a', 'user-b'],
    items: [
      { id: 'item-a', title: 'A private', category: 'ANIME' },
      { id: 'item-b', title: 'B private', category: 'BOOK' },
    ],
    trackings: [
      { userId: 'user-a', itemId: 'item-a', status: 'WATCHING', rating: null, progress: 3, isFavorite: false },
      { userId: 'user-b', itemId: 'item-b', status: 'COMPLETED', rating: 'NINE', progress: null, isFavorite: true },
    ],
    logs: [],
  };
  failNext = {};
};
const maybeFail = (name) => {
  if (failNext[name]) { delete failNext[name]; throw new Error(`${name} failed`); }
};
const findTracking = ({ userId, itemId }) => db.trackings.find((t) => t.userId === userId && t.itemId === itemId);
const withItem = (tracking) => tracking && { ...tracking, item: db.items.find((item) => item.id === tracking.itemId) };
const defined = (data) => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
const prismaFixture = {
  user: { async findUnique({ where }) { return db.users.includes(where.id) ? { id: where.id } : null; } },
  trackingItem: {
    async findFirst({ where }) {
      return db.items.find((item) => item.category === where.category
        && item.title.toLowerCase() === where.title.equals.toLowerCase()) ?? null;
    },
    async create({ data }) {
      maybeFail('trackingItem.create');
      const { userTrackings, ...fields } = data;
      const item = { id: `item-${db.items.length + 1}`, ...fields };
      db.items.push(item);
      const tracking = { ...userTrackings.create, itemId: item.id };
      db.trackings.push(tracking);
      return { ...item, userTrackings: [tracking] };
    },
  },
  userTracking: {
    async create({ data }) {
      maybeFail('userTracking.create');
      if (findTracking(data)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      db.trackings.push({ ...data });
      return withItem(data);
    },
    async findUnique({ where }) { return withItem(findTracking(where.userId_itemId)) ?? null; },
    async update({ where, data }) {
      maybeFail('userTracking.update');
      const tracking = findTracking(where.userId_itemId);
      Object.assign(tracking, defined(data));
      return withItem(tracking);
    },
    async delete({ where }) {
      maybeFail('userTracking.delete');
      const tracking = findTracking(where.userId_itemId);
      db.trackings = db.trackings.filter((t) => t !== tracking);
      return tracking;
    },
  },
  activityLog: { async create({ data }) { maybeFail('activityLog.create'); db.logs.push(data); return data; } },
};

let events;
const recorder = { track: async (event, userId, props = {}) => { events.push({ event, userId, props }); } };
const loadInternal = (analytics) => loadRoute('src/app/api/internal/tracking/route.ts', {
  '@/lib/prisma': { __esModule: true, default: prismaFixture },
  '@prisma/client': prismaClientStub,
  '@/lib/analytics': analytics,
}).route;
const internal = loadInternal(recorder);

const SECRET = 'test-only-internal-secret';
const originalSecret = process.env.INTERNAL_API_SECRET;
beforeEach(() => {
  resetDb();
  events = [];
  process.env.INTERNAL_API_SECRET = SECRET;
  mock.method(console, 'error', () => {});
});
afterEach(() => {
  mock.restoreAll();
  if (originalSecret === undefined) delete process.env.INTERNAL_API_SECRET;
  else process.env.INTERNAL_API_SECRET = originalSecret;
});

const call = (route, method, { body, query = '', secret = SECRET } = {}) => route[method](new NextRequest(
  `https://internal.test/api/internal/tracking${query}`,
  {
    method,
    headers: { 'content-type': 'application/json', ...(secret ? { 'x-internal-secret': secret } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  },
));
const names = () => events.map((e) => e.event);

test('add emits tracking_item_added (AC-05)', async () => {
  const linked = await call(internal, 'POST', { body: { userId: 'user-a', title: 'b private', category: 'BOOK' } });
  assert.equal(linked.status, 201);
  const created = await call(internal, 'POST', { body: { userId: 'user-a', title: 'Frieren', category: 'ANIME', status: 'WATCHING' } });
  assert.equal(created.status, 201);

  assert.deepEqual(events, [
    { event: 'tracking_item_added', userId: 'user-a', props: { category: 'BOOK', source: 'existing_item', status: 'PLAN_TO_WATCH' } },
    { event: 'tracking_item_added', userId: 'user-a', props: { category: 'ANIME', source: 'new_item', status: 'WATCHING' } },
  ]);
});

test('update emits tracking_updated and completed (AC-06)', async () => {
  const response = await call(internal, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', progress: 12, status: 'COMPLETED', isFavorite: false } });
  assert.equal(response.status, 200);
  assert.deepEqual(events, [
    { event: 'tracking_updated', userId: 'user-a', props: { fields_changed: ['status', 'progress'], status: 'COMPLETED' } },
    { event: 'tracking_item_completed', userId: 'user-a', props: { category: 'ANIME' } },
  ]);

  // Already completed: an update is not a second completion.
  events = [];
  await call(internal, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', status: 'COMPLETED', rating: 'EIGHT' } });
  assert.deepEqual(events, [
    { event: 'tracking_updated', userId: 'user-a', props: { fields_changed: ['rating'], status: 'COMPLETED' } },
  ]);
});

test('update with no stored change sends nothing (AC-06)', async () => {
  const response = await call(internal, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', status: 'WATCHING', progress: 3, isFavorite: false } });
  assert.equal(response.status, 200);
  assert.deepEqual(events, []);
});

test('delete emits tracking_item_removed (AC-08)', async () => {
  const response = await call(internal, 'DELETE', { query: '?userId=user-a&itemId=item-a' });
  assert.equal(response.status, 200);
  assert.deepEqual(events, [{ event: 'tracking_item_removed', userId: 'user-a', props: { category: 'ANIME' } }]);
});

test('failed writes emit tracking_write_failed (AC-07)', async () => {
  const cases = [
    ['POST', { body: { userId: 'ghost', title: 'X', category: 'BOOK' } }, 404, 'ghost'],
    ['POST', { body: { userId: 'user-b', title: 'B private', category: 'BOOK' } }, 409, 'user-b'],
    ['PUT', { body: { userId: 'user-a', itemId: 'item-missing', status: 'DROPPED' } }, 404, 'user-a'],
    ['DELETE', { query: '?userId=user-a&itemId=item-missing' }, 404, 'user-a'],
  ];
  for (const [method, options, status, userId] of cases) {
    events = [];
    const response = await call(internal, method, options);
    assert.equal(response.status, status, `${method} ${status}`);
    assert.deepEqual(events, [{ event: 'tracking_write_failed', userId, props: { method, status_code: status } }]);
  }

  events = [];
  failNext['userTracking.update'] = true;
  const crashed = await call(internal, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', status: 'DROPPED' } });
  assert.equal(crashed.status, 500);
  assert.deepEqual(events, [{ event: 'tracking_write_failed', userId: 'user-a', props: { method: 'PUT', status_code: 500 } }]);
});

test('failures without a userId or secret send nothing (AC-07)', async () => {
  assert.equal((await call(internal, 'POST', { body: { title: 'X', category: 'BOOK' } })).status, 400);
  assert.equal((await call(internal, 'PUT', { body: { itemId: 'item-a' } })).status, 400);
  assert.equal((await call(internal, 'DELETE', { query: '?itemId=item-a' })).status, 400);
  assert.equal((await call(internal, 'POST', { body: '{not json' })).status, 500);
  assert.equal((await call(internal, 'POST', { body: { userId: 'user-a', title: 'X', category: 'BOOK' }, secret: 'wrong' })).status, 401);
  assert.deepEqual(events, []);
});

test('log failure after commit sends no failed event (AC-07)', async () => {
  for (const [method, options, expected] of [
    ['POST', { body: { userId: 'user-a', title: 'Dune', category: 'BOOK' } }, 'tracking_item_added'],
    ['PUT', { body: { userId: 'user-a', itemId: 'item-a', status: 'COMPLETED' } }, 'tracking_updated'],
    ['DELETE', { query: '?userId=user-a&itemId=item-a' }, 'tracking_item_removed'],
  ]) {
    events = [];
    failNext['activityLog.create'] = true;
    const response = await call(internal, method, options);
    assert.equal(response.status, 500, method);
    assert.ok(names().includes(expected), `${method} sent ${expected}`);
    assert.ok(!names().includes('tracking_write_failed'), `${method} sent no failure`);
  }
});

test('refused write leaks nothing (AC-09)', async () => {
  const put = await call(internal, 'PUT', { body: { userId: 'user-a', itemId: 'item-b', status: 'DROPPED' } });
  const del = await call(internal, 'DELETE', { query: '?userId=user-a&itemId=item-b' });
  assert.equal(put.status, 404);
  assert.equal(del.status, 404);
  assert.deepEqual(events, [
    { event: 'tracking_write_failed', userId: 'user-a', props: { method: 'PUT', status_code: 404 } },
    { event: 'tracking_write_failed', userId: 'user-a', props: { method: 'DELETE', status_code: 404 } },
  ]);
  assert.doesNotMatch(JSON.stringify(events), /user-b|BOOK|B private/);
  assert.equal(findTracking({ userId: 'user-b', itemId: 'item-b' }).status, 'COMPLETED');
});

test('write succeeds when analytics fails (AC-04)', async () => {
  const { route: realAnalytics } = loadRoute('src/lib/analytics.ts');
  const withRealAnalytics = loadInternal(realAnalytics);
  const originalFetch = global.fetch;
  const originalKey = process.env.POSTHOG_PROJECT_KEY;
  const originalFlag = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
  process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'true';
  global.fetch = async () => { throw new Error('network down'); };
  mock.method(console, 'warn', () => {});
  try {
    const off = await call(loadInternal({ track: async () => {} }), 'PUT', { body: { userId: 'user-a', itemId: 'item-a', progress: 4 } });
    const offBody = await off.json();
    resetDb();
    const on = await call(withRealAnalytics, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', progress: 4 } });
    assert.equal(on.status, off.status);
    assert.deepEqual(await on.json(), offBody);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.POSTHOG_PROJECT_KEY;
    else process.env.POSTHOG_PROJECT_KEY = originalKey;
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
    else process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = originalFlag;
  }
});

const flush = () => new Promise((resolve) => setImmediate(resolve));
const withRealAnalytics = async (fetchImpl, run) => {
  const { route: realAnalytics } = loadRoute('src/lib/analytics.ts');
  const route = loadInternal(realAnalytics);
  const originalFetch = global.fetch;
  const saved = {
    key: process.env.POSTHOG_PROJECT_KEY,
    timeout: process.env.POSTHOG_TIMEOUT_MS,
    flag: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
  };
  process.env.POSTHOG_PROJECT_KEY = 'phc_test_only';
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'true';
  process.env.POSTHOG_TIMEOUT_MS = '50';
  global.fetch = fetchImpl;
  const warnings = [];
  mock.method(console, 'warn', (...args) => { warnings.push(args); });
  try {
    await run(route, warnings);
  } finally {
    global.fetch = originalFetch;
    mock.timers.reset();
    for (const [name, value] of [
      ['POSTHOG_PROJECT_KEY', saved.key],
      ['POSTHOG_TIMEOUT_MS', saved.timeout],
      ['NEXT_PUBLIC_ANALYTICS_ENABLED', saved.flag],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
};

test('a completing PUT waits for one timeout, not two (AC-04, NFR)', async () => {
  const sent = [];
  await withRealAnalytics((url, init) => { sent.push(JSON.parse(init.body).event); return new Promise(() => {}); }, async (route, warnings) => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const pending = call(route, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', status: 'COMPLETED' } });
    for (let i = 0; i < 20; i += 1) await flush();
    // Both events must already be in flight before the first timeout fires.
    assert.deepEqual(sent.sort(), ['tracking_item_completed', 'tracking_updated']);
    mock.timers.tick(50);
    const response = await pending;
    assert.equal(response.status, 200);
    assert.equal(warnings.length, 2);
  });
});

test('pre-commit 500 on POST and DELETE emits tracking_write_failed (AC-07)', async () => {
  for (const [method, options, failing] of [
    ['POST', { body: { userId: 'user-a', title: 'b private', category: 'BOOK' } }, 'userTracking.create'],
    ['POST', { body: { userId: 'user-a', title: 'Dune', category: 'BOOK' } }, 'trackingItem.create'],
    ['DELETE', { query: '?userId=user-a&itemId=item-a' }, 'userTracking.delete'],
  ]) {
    events = [];
    failNext[failing] = true;
    const response = await call(internal, method, options);
    assert.equal(response.status, 500, failing);
    assert.deepEqual(events, [{ event: 'tracking_write_failed', userId: 'user-a', props: { method, status_code: 500 } }]);
  }
});

test('date changes are listed in fields_changed (AC-06)', async () => {
  await call(internal, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', startDate: '2026-10-01T00:00:00.000Z' } });
  assert.deepEqual(events.at(-1).props.fields_changed, ['startDate']);
  events = [];
  await call(internal, 'PUT', { body: { userId: 'user-a', itemId: 'item-a', startDate: '2026-10-01T00:00:00.000Z' } });
  assert.deepEqual(events, []);
});

test('analytics failure logs one warning without the reason text (AC-04)', async () => {
  await withRealAnalytics(async () => { throw new Error('connect https://user:pass@ingest.test failed'); }, async (route, warnings) => {
    const response = await call(route, 'DELETE', { query: '?userId=user-a&itemId=item-a' });
    assert.equal(response.status, 200);
    assert.equal(warnings.length, 1);
    assert.doesNotMatch(JSON.stringify(warnings), /user:pass|ingest\.test|phc_test_only|user-a/);
  });
});
