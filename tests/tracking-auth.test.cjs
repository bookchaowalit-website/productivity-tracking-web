const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { loadRoute } = require('./helpers/load-route.cjs');

// End to end through both layers: the public route's fetch is wired to the real
// internal route, whose Prisma client is a fixture with two users' data.
const ITEMS = [
  { id: 'item-a', title: 'A private', category: 'ANIME', userTrackings: [{ userId: 'user-a', status: 'WATCHING', isFavorite: false }] },
  { id: 'item-b', title: 'B private', category: 'BOOK', userTrackings: [{ userId: 'user-b', status: 'COMPLETED', isFavorite: true }] },
];
let findManyArgs = [];
const prismaFixture = {
  trackingItem: {
    async findMany(args) {
      findManyArgs.push(args);
      const match = args.where.userTrackings.some;
      return ITEMS
        .filter((item) => item.userTrackings.some((t) => Object.entries(match).every(([key, value]) => t[key] === value)))
        .map((item) => ({ ...item, userTrackings: item.userTrackings.filter((t) => t.userId === args.include.userTrackings.where.userId) }));
    },
  },
};

let session = null;
const { route: publicRoute } = loadRoute('src/app/api/tracking/route.ts', {
  'next-auth': { getServerSession: async () => session },
  '@/lib/auth': { authOptions: {} },
});
const { route: internalRoute } = loadRoute('src/app/api/internal/tracking/route.ts', {
  '@/lib/prisma': { __esModule: true, default: prismaFixture },
  '@prisma/client': { ContentCategory: {}, TrackingStatus: {}, RatingScale: {}, Prisma: {} },
  // Analytics is covered by tracking-analytics.test.cjs; a no-op here.
  '@/lib/analytics': { track: async () => {} },
});

const ENV_KEYS = ['INTERNAL_API_SECRET', 'INTERNAL_API_ORIGIN', 'NEXTAUTH_URL', 'VERCEL_URL'];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = global.fetch;

beforeEach(() => {
  session = null;
  findManyArgs = [];
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.INTERNAL_API_SECRET = 'test-only-internal-secret';
  process.env.INTERNAL_API_ORIGIN = 'https://internal.test';
  global.fetch = async (url, init) => internalRoute.GET(new NextRequest(url, init));
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

const signInAs = (id) => { session = { user: { id }, expires: '2999-01-01T00:00:00.000Z' }; };
const read = (query = '') => publicRoute.GET(new NextRequest(`http://localhost/api/tracking${query}`));

test('anonymous read returns 401 and never queries the database', async () => {
  const response = await read('?userId=user-a');
  assert.equal(response.status, 401);
  assert.equal(findManyArgs.length, 0);
});

test('user A reads their own items', async () => {
  signInAs('user-a');
  const response = await read();
  assert.equal(response.status, 200);
  const items = await response.json();
  assert.deepEqual(items.map((item) => item.id), ['item-a']);
  assert.equal(findManyArgs[0].where.userTrackings.some.userId, 'user-a');
});

test('user A cannot read user B, by naming B or by default', async () => {
  signInAs('user-a');
  const named = await read('?userId=user-b');
  assert.equal(named.status, 403);
  assert.equal(findManyArgs.length, 0);

  const filtered = await read('?isFavorite=true');
  assert.equal(filtered.status, 200);
  assert.deepEqual(await filtered.json(), []);
  assert.ok(findManyArgs.every((args) => JSON.stringify(args).includes('"user-a"') && !JSON.stringify(args).includes('user-b')));
});

test('user B reads only their own items', async () => {
  signInAs('user-b');
  const response = await read('?userId=user-b');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).map((item) => item.id), ['item-b']);
});
