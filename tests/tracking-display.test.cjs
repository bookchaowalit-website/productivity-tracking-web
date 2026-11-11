const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadRoute } = require('./helpers/load-route.cjs');

const { route } = loadRoute('src/lib/tracking-display.ts');

test('book with chapters uses chapters for text and bar', () => {
  assert.deepEqual(route.getProgress({
    category: 'BOOK', progress: 4, totalEpisodes: null, totalChapters: 12, totalBooks: 1,
  }), { text: '4/12 chapters', percent: 33 });
});

test('book without chapters uses books', () => {
  assert.deepEqual(route.getProgress({
    category: 'BOOK', progress: 1, totalEpisodes: null, totalChapters: null, totalBooks: 3,
  }), { text: '1/3 books', percent: 33 });
});

test('series uses episodes', () => {
  assert.deepEqual(route.getProgress({
    category: 'TV_SHOW', progress: 18, totalEpisodes: 18, totalChapters: null, totalBooks: null,
  }), { text: '18/18 episodes', percent: 100 });
  assert.deepEqual(route.getProgress({
    category: 'ANIME', progress: 5, totalEpisodes: null, totalChapters: null, totalBooks: null,
  }), { text: '5/? episodes', percent: null });
});

test('manga uses chapters', () => {
  assert.deepEqual(route.getProgress({
    category: 'MANGA', progress: 10, totalEpisodes: null, totalChapters: null, totalBooks: null,
  }), { text: '10/? chapters', percent: null });
});

test('other categories use the first available total', () => {
  assert.deepEqual(route.getProgress({
    category: 'GAME', progress: 3, totalEpisodes: null, totalChapters: null, totalBooks: null,
  }), { text: 'Progress: 3', percent: null });
  assert.deepEqual(route.getProgress({
    category: 'GAME', progress: 3, totalEpisodes: null, totalChapters: 10, totalBooks: null,
  }), { text: '3/10 chapters', percent: 30 });
});

test('no progress returns null', () => {
  for (const progress of [0, null, undefined]) {
    assert.equal(route.getProgress({
      category: 'BOOK', progress, totalEpisodes: null, totalChapters: 12, totalBooks: 1,
    }), null);
  }
});

test('percent is clamped and zero totals are treated as missing', () => {
  assert.deepEqual(route.getProgress({
    category: 'TV_SHOW', progress: 20, totalEpisodes: 12, totalChapters: null, totalBooks: null,
  }), { text: '20/12 episodes', percent: 100 });
  assert.deepEqual(route.getProgress({
    category: 'TV_SHOW', progress: 7, totalEpisodes: 0, totalChapters: null, totalBooks: null,
  }), { text: '7/? episodes', percent: null });
});

test('labels are category-neutral', () => {
  assert.equal(route.STATUS_LABELS.PLAN_TO_WATCH, 'Planned');
  assert.equal(route.STATUS_LABELS.WATCHING, 'In progress');
  assert.equal(Object.values(route.STATUS_LABELS).some((label) => /watch|read/i.test(label)), false);
});

test('scrollHints reports overflow at either edge with a one pixel tolerance', () => {
  assert.deepEqual(route.scrollHints({ scrollLeft: 0, scrollWidth: 900, clientWidth: 390 }), { left: false, right: true });
  assert.deepEqual(route.scrollHints({ scrollLeft: 510, scrollWidth: 900, clientWidth: 390 }), { left: true, right: false });
  assert.deepEqual(route.scrollHints({ scrollLeft: 509.5, scrollWidth: 900, clientWidth: 390 }), { left: true, right: false });
  assert.deepEqual(route.scrollHints({ scrollLeft: 0, scrollWidth: 390, clientWidth: 390 }), { left: false, right: false });
});
