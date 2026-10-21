const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { loadRoute } = require('./helpers/load-route.cjs');

// Writes end to end through both layers: the public route's fetch is wired to
// the real internal route, whose Prisma client is an in-memory fixture with
// two users. Every forwarded request is recorded so tests can see what the
// public route sent.
const enumOf = (...values) => Object.fromEntries(values.map((value) => [value, value]));
const prismaClientStub = {
  ContentCategory: enumOf('ANIME', 'MANGA', 'MOVIE', 'TV_SHOW', 'BOOK', 'WEBSITE', 'PODCAST', 'GAME', 'OTHER'),
  TrackingStatus: enumOf('PLAN_TO_WATCH', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'),
  RatingScale: enumOf('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'),
  Prisma: {},
};

let db;
let writes;
const resetDb = () => {
  db = {
    users: ['user-a', 'user-b'],
    items: [
      { id: 'item-a', title: 'A private', category: 'ANIME' },
      { id: 'item-b', title: 'B private', category: 'BOOK' },
    ],
    trackings: [
      { userId: 'user-a', itemId: 'item-a', status: 'WATCHING', rating: null, isFavorite: false },
      { userId: 'user-b', itemId: 'item-b', status: 'COMPLETED', rating: 'NINE', isFavorite: true },
    ],
    logs: [],
  };
  writes = [];
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
      const { userTrackings, ...fields } = data;
      const item = { id: `item-${db.items.length + 1}`, ...fields };
      db.items.push(item);
      const tracking = { ...userTrackings.create, itemId: item.id };
      db.trackings.push(tracking);
      writes.push(['create', tracking.userId, item.id]);
      return { ...item, userTrackings: [tracking] };
    },
  },
  userTracking: {
    async create({ data }) {
      if (findTracking(data)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      db.trackings.push({ ...data });
      writes.push(['create', data.userId, data.itemId]);
      return withItem(data);
    },
    async findUnique({ where }) { return withItem(findTracking(where.userId_itemId)) ?? null; },
    async update({ where, data }) {
      const tracking = findTracking(where.userId_itemId);
      if (!tracking) throw new Error('Record to update not found');
      Object.assign(tracking, defined(data));
      writes.push(['update', tracking.userId, tracking.itemId]);
      return withItem(tracking);
    },
    async delete({ where }) {
      const tracking = findTracking(where.userId_itemId);
      if (!tracking) throw new Error('Record to delete does not exist');
      db.trackings = db.trackings.filter((t) => t !== tracking);
      writes.push(['delete', tracking.userId, tracking.itemId]);
      return tracking;
    },
  },
  activityLog: { async create({ data }) { db.logs.push(data); return data; } },
};

let session = null;
const { route: publicRoute } = loadRoute('src/app/api/tracking/route.ts', {
  'next-auth': { getServerSession: async () => session },
  '@/lib/auth': { authOptions: {} },
});
const { route: internalRoute } = loadRoute('src/app/api/internal/tracking/route.ts', {
  '@/lib/prisma': { __esModule: true, default: prismaFixture },
  '@prisma/client': prismaClientStub,
  // Analytics is covered by tracking-analytics.test.cjs; a no-op here.
  '@/lib/analytics': { track: async () => {} },
});

const APP_ORIGIN = 'https://tracking.example.test';
const ENV_KEYS = ['INTERNAL_API_SECRET', 'INTERNAL_API_ORIGIN', 'NEXTAUTH_URL', 'VERCEL_URL'];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = global.fetch;
let forwarded = [];

beforeEach(() => {
  session = null;
  forwarded = [];
  resetDb();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.INTERNAL_API_SECRET = 'test-only-internal-secret';
  process.env.INTERNAL_API_ORIGIN = 'https://internal.test';
  process.env.NEXTAUTH_URL = APP_ORIGIN;
  global.fetch = async (url, init) => {
    forwarded.push({ url: new URL(url), init, body: init.body === undefined ? undefined : JSON.parse(init.body) });
    return internalRoute[init.method](new NextRequest(url, init));
  };
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

const signInAs = (id) => { session = { user: { id }, expires: '2999-01-01T00:00:00.000Z' }; };
const SAME_ORIGIN = { origin: APP_ORIGIN, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
const write = (method, body, { query = '', headers = SAME_ORIGIN } = {}) => publicRoute[method](new NextRequest(
  `${APP_ORIGIN}/api/tracking${query}`,
  { method, headers, body: typeof body === 'string' ? body : JSON.stringify(body) },
));
const trackingOf = (userId, itemId) => findTracking({ userId, itemId });

for (const [method, body] of [
  ['POST', { title: 'Anon', category: 'BOOK' }],
  ['PUT', { itemId: 'item-b', status: 'DROPPED' }],
  ['DELETE', { itemId: 'item-b' }],
]) {
  test(`anonymous ${method} returns 401 before reading the body or forwarding`, async () => {
    const request = new NextRequest(`${APP_ORIGIN}/api/tracking?userId=user-b`, {
      method,
      headers: { ...SAME_ORIGIN, 'x-internal-secret': 'test-only-internal-secret', cookie: 'next-auth.session-token=forged' },
      body: JSON.stringify({ ...body, userId: 'user-b' }),
    });
    request.text = async () => { throw new Error('An anonymous write must not read its body'); };
    const response = await publicRoute[method](request);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });
    assert.equal(forwarded.length, 0);
    assert.deepEqual(writes, []);
  });
}

test('user A cannot modify user B\'s item', async () => {
  signInAs('user-a');
  const response = await write('PUT', { itemId: 'item-b', status: 'DROPPED', isFavorite: false });
  assert.equal(response.status, 404);
  assert.deepEqual(writes, []);
  assert.equal(trackingOf('user-b', 'item-b').status, 'COMPLETED');
  assert.equal(trackingOf('user-b', 'item-b').isFavorite, true);
  // The internal route was asked about A's row, never B's.
  assert.equal(forwarded[0].body.userId, 'user-a');
});

test('user A cannot delete user B\'s item', async () => {
  signInAs('user-a');
  const response = await write('DELETE', { itemId: 'item-b' });
  assert.equal(response.status, 404);
  assert.deepEqual(writes, []);
  assert.ok(trackingOf('user-b', 'item-b'));
  assert.deepEqual(forwarded[0].url.searchParams.getAll('userId'), ['user-a']);
});

for (const [name, method, body, query] of [
  ['PUT naming B in the body', 'PUT', { itemId: 'item-b', status: 'DROPPED', userId: 'user-b' }, ''],
  ['DELETE naming B in the body', 'DELETE', { itemId: 'item-b', userId: 'user-b' }, ''],
  ['DELETE naming B in the query', 'DELETE', { itemId: 'item-b' }, '?userId=user-b'],
  ['POST naming B in the body', 'POST', { title: 'Planted', category: 'BOOK', userId: 'user-b' }, ''],
  ['POST with a null userId', 'POST', { title: 'Planted', category: 'BOOK', userId: null }, ''],
  ['PUT naming A and B in the query', 'PUT', { itemId: 'item-a', status: 'DROPPED' }, '?userId=user-a&userId=user-b'],
]) {
  test(`user A ${name} is refused with 403 and never forwarded`, async () => {
    signInAs('user-a');
    const response = await write(method, body, { query });
    assert.equal(response.status, 403);
    assert.equal(forwarded.length, 0);
    assert.deepEqual(writes, []);
  });
}

test('own update, add and delete work and are keyed to the session user', async () => {
  signInAs('user-a');

  const updated = await write('PUT', { itemId: 'item-a', status: 'COMPLETED', rating: 'EIGHT', userId: 'user-a' });
  assert.equal(updated.status, 200);
  assert.equal(trackingOf('user-a', 'item-a').status, 'COMPLETED');
  assert.equal(trackingOf('user-a', 'item-a').rating, 'EIGHT');

  // Adding an item another user already tracks links A to it without touching B's row.
  const linked = await write('POST', { title: 'b PRIVATE', category: 'BOOK', isFavorite: true });
  assert.equal(linked.status, 201);
  assert.equal(trackingOf('user-a', 'item-b').isFavorite, true);
  assert.equal(trackingOf('user-b', 'item-b').status, 'COMPLETED');

  const created = await write('POST', {
    title: 'Frieren', category: 'ANIME', genres: ['Fantasy'], year: 2023, externalUrl: 'https://example.test/frieren',
  });
  assert.equal(created.status, 201);
  const newId = (await created.json()).id;
  assert.equal(trackingOf('user-a', newId).status, 'PLAN_TO_WATCH');

  const removed = await write('DELETE', { itemId: 'item-a' });
  assert.equal(removed.status, 200);
  assert.equal(trackingOf('user-a', 'item-a'), undefined);

  assert.deepEqual(writes, [
    ['update', 'user-a', 'item-a'],
    ['create', 'user-a', 'item-b'],
    ['create', 'user-a', newId],
    ['delete', 'user-a', 'item-a'],
  ]);
  for (const { url, init, body } of forwarded) {
    assert.equal(url.origin, 'https://internal.test');
    assert.equal(init.headers['x-internal-secret'], 'test-only-internal-secret');
    assert.equal(init.headers.cookie, undefined);
    assert.equal(init.redirect, 'manual');
    assert.equal(body ? body.userId : url.searchParams.get('userId'), 'user-a');
  }
});

test('adding an item already on your list is a 409, not a server error', async () => {
  signInAs('user-a');
  const response = await write('POST', { title: 'A private', category: 'ANIME' });
  assert.equal(response.status, 409);
});

test('only allow-listed fields are forwarded, with userId from the session', async () => {
  signInAs('user-a');
  await write('PUT', { itemId: 'item-a', progress: 3, userId: 'user-a' });
  assert.deepEqual(forwarded[0].body, { itemId: 'item-a', progress: 3, userId: 'user-a' });
  await write('DELETE', { itemId: 'item-a' }, { query: '?userId=user-a&itemId=item-b&evil=1' });
  assert.deepEqual([...forwarded[1].url.searchParams], [['userId', 'user-a'], ['itemId', 'item-a']]);
  assert.equal(forwarded[1].init.body, undefined);
});

for (const [name, method, body] of [
  ['an unknown field', 'PUT', { itemId: 'item-a', status: 'WATCHING', id: 'x' }],
  ['a nested write', 'POST', { title: 'X', category: 'BOOK', userTrackings: { create: { userId: 'user-b' } } }],
  ['a server-owned column', 'POST', { title: 'X', category: 'BOOK', createdAt: '2000-01-01' }],
  ['an unknown status', 'PUT', { itemId: 'item-a', status: 'HACKED' }],
  ['an unknown category', 'POST', { title: 'X', category: 'SECRET' }],
  ['a javascript: link', 'POST', { title: 'X', category: 'BOOK', externalUrl: 'javascript:alert(1)' }],
  ['a missing title', 'POST', { category: 'BOOK' }],
  ['a missing itemId', 'DELETE', {}],
  ['a non-string itemId', 'PUT', { itemId: { not: 'item-a' } }],
  ['a priority out of range', 'PUT', { itemId: 'item-a', priority: 99 }],
  ['an array body', 'PUT', [{ itemId: 'item-a' }]],
  ['invalid JSON', 'PUT', '{"itemId":'],
]) {
  test(`a write with ${name} is refused with 400 and never forwarded`, async () => {
    signInAs('user-a');
    const response = await write(method, body);
    assert.equal(response.status, 400);
    assert.equal(forwarded.length, 0);
  });
}

test('an oversized body is refused with 413', async () => {
  signInAs('user-a');
  const response = await write('POST', { title: 'X', category: 'BOOK', description: 'x'.repeat(20 * 1024) });
  assert.equal(response.status, 413);
  assert.equal(forwarded.length, 0);
});

for (const [name, headers, status] of [
  ['no Origin header', { 'content-type': 'application/json' }, 403],
  ['a foreign Origin', { ...SAME_ORIGIN, origin: 'https://attacker.example' }, 403],
  ['the literal null Origin', { ...SAME_ORIGIN, origin: 'null' }, 403],
  ['an http Origin for an https app', { ...SAME_ORIGIN, origin: 'http://tracking.example.test' }, 403],
  ['Sec-Fetch-Site: cross-site', { ...SAME_ORIGIN, 'sec-fetch-site': 'cross-site' }, 403],
  ['Sec-Fetch-Site: same-site', { ...SAME_ORIGIN, 'sec-fetch-site': 'same-site' }, 403],
  ['a text/plain body', { ...SAME_ORIGIN, 'content-type': 'text/plain' }, 415],
  ['a form body', { ...SAME_ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, 415],
  ['no Content-Type', { origin: APP_ORIGIN }, 415],
]) {
  test(`a signed-in write with ${name} is refused with ${status} (CSRF)`, async () => {
    signInAs('user-a');
    const response = await write('PUT', { itemId: 'item-a', status: 'DROPPED' }, { headers });
    assert.equal(response.status, status);
    assert.equal(forwarded.length, 0);
    assert.equal(trackingOf('user-a', 'item-a').status, 'WATCHING');
  });
}

test('a forged Host header cannot make an attacker origin same-origin', async () => {
  signInAs('user-a');
  const response = await publicRoute.PUT(new NextRequest('https://attacker.example/api/tracking', {
    method: 'PUT',
    headers: { ...SAME_ORIGIN, origin: 'https://attacker.example', host: 'attacker.example' },
    body: JSON.stringify({ itemId: 'item-a', status: 'DROPPED' }),
  }));
  assert.equal(response.status, 403);
  assert.equal(forwarded.length, 0);
});

test('a JSON content type with a charset and no Fetch Metadata is accepted', async () => {
  signInAs('user-a');
  const response = await write('PUT', { itemId: 'item-a', isFavorite: true }, {
    headers: { origin: APP_ORIGIN, 'content-type': 'application/json; charset=utf-8' },
  });
  assert.equal(response.status, 200);
  assert.equal(trackingOf('user-a', 'item-a').isFavorite, true);
});

test('a stale tab showing A, whose cookie now belongs to B, cannot write to B', async () => {
  // page.tsx sends the user id its view shows; the server session is now B.
  signInAs('user-b');
  const response = await write('PUT', { itemId: 'item-b', rating: 'ONE', userId: 'user-a' });
  assert.equal(response.status, 403);
  assert.equal(forwarded.length, 0);
  assert.equal(trackingOf('user-b', 'item-b').rating, 'NINE');
});

test('a chunked body over the limit is cut off without buffering it all', async () => {
  signInAs('user-a');
  let pulled = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (pulled === 64) return controller.close();
      pulled += 1;
      controller.enqueue(new Uint8Array(16 * 1024).fill(120));
    },
  });
  const response = await publicRoute.POST(new NextRequest(`${APP_ORIGIN}/api/tracking`, {
    method: 'POST', headers: SAME_ORIGIN, body, duplex: 'half',
  }));
  assert.equal(response.status, 413);
  assert.ok(pulled < 64, `read ${pulled} of 64 chunks`);
  assert.equal(forwarded.length, 0);
});

test('the UI sends the user id its view shows on every write', () => {
  const source = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../src/app/page.tsx'), 'utf8');
  assert.match(source, /JSON\.stringify\(\{ \.\.\.body, userId: viewUserId \}\)/);
  assert.doesNotMatch(source, /READ_ONLY_NOTICE/);
});

test('an explicit null clears a field and an omitted field is kept', async () => {
  signInAs('user-b');
  Object.assign(trackingOf('user-b', 'item-b'), { startDate: new Date('2026-01-01'), progress: 4 });
  const response = await write('PUT', { itemId: 'item-b', rating: null, startDate: null, finishDate: null });
  assert.equal(response.status, 200);
  const tracking = trackingOf('user-b', 'item-b');
  assert.equal(tracking.rating, null);
  assert.equal(tracking.startDate, null);
  assert.equal(tracking.finishDate, null);
  assert.equal(tracking.progress, 4);
  assert.equal(tracking.status, 'COMPLETED');
});
