const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadRoute } = require('./helpers/load-route.cjs');

// PostHog adapter: privacy-first init options, URL scrubbing before send, and
// a thin mapping from the provider-neutral calls. posthog-js is replaced by a
// recorder; the real SDK is never loaded here.
const { route: core } = loadRoute('src/lib/browser-analytics.ts', { './posthog-adapter': { loadPostHog: async () => null } });
const { route: adapter } = loadRoute('src/lib/posthog-adapter.ts', { './browser-analytics': core });

function fakePostHog() {
  const calls = [];
  const posthog = new Proxy({}, {
    get: (_, name) => (...args) => { calls.push([name, ...args]); },
  });
  return { calls, importer: async () => ({ default: posthog }) };
}

test('init options: no autocapture, no recordings, no surveys, no flags, masked text, manual pageviews', () => {
  const options = adapter.posthogOptions('https://eu.i.posthog.com');
  assert.equal(options.api_host, 'https://eu.i.posthog.com');
  for (const key of ['autocapture', 'capture_pageview', 'capture_pageleave', 'capture_heatmaps', 'capture_dead_clicks', 'save_campaign_params',
    'capture_exceptions', 'rageclick']) {
    assert.equal(options[key], false, key);
  }
  for (const key of ['disable_session_recording', 'disable_surveys', 'disable_web_experiments',
    'disable_external_dependency_loading', 'advanced_disable_flags', 'mask_all_text', 'mask_all_element_attributes']) {
    assert.equal(options[key], true, key);
  }
  assert.equal(options.session_recording.maskAllInputs, true);
  assert.equal(options.persistence, 'localStorage', 'no cookies even after consent');
  assert.equal(options.person_profiles, 'identified_only');
  assert.equal(typeof options.before_send, 'function');
});

test('before_send strips query strings, fragments, ids, referrer paths and the IP', () => {
  const scrubbed = adapter.scrubCapture({
    uuid: 'u', event: '$pageview',
    properties: {
      $current_url: 'https://bookchaowalit-tracking.vercel.app/items/123?token=abc#x',
      $pathname: '/items/123',
      $referrer: 'https://mail.example.test/inbox/a@example.test?id=9',
      $referring_domain: 'mail.example.test',
      $initial_current_url: 'https://bookchaowalit-tracking.vercel.app/?utm_source=x&email=a@example.test',
      $ip: '203.0.113.9',
      product: 'trackit',
    },
    $set: { $current_url: 'https://bookchaowalit-tracking.vercel.app/?q=private' },
    $set_once: { $initial_referrer: 'https://mail.example.test/inbox?id=9' },
  });
  assert.deepEqual(scrubbed.properties, {
    $current_url: 'https://bookchaowalit-tracking.vercel.app/items/:id',
    $pathname: '/items/:id',
    $referrer: 'https://mail.example.test',
    $referring_domain: 'mail.example.test',
    $initial_current_url: 'https://bookchaowalit-tracking.vercel.app/',
    $geoip_disable: true,
    product: 'trackit',
  });
  assert.equal(scrubbed.$set.$current_url, 'https://bookchaowalit-tracking.vercel.app/');
  assert.equal(scrubbed.$set_once.$initial_referrer, 'https://mail.example.test');
  assert.doesNotMatch(JSON.stringify(scrubbed), /token|private|@|utm|203\.0/);
  assert.equal(adapter.scrubCapture(null), null);
});

test('loadPostHog maps the neutral calls and registers the product', async () => {
  const { calls, importer } = fakePostHog();
  const a = await adapter.loadPostHog({ key: 'phc_test_only', host: 'https://eu.i.posthog.com' }, importer);
  a.track('collection_filtered', { filter: 'search', product: 'trackit' });
  a.identify('clx0abcdef0000000000000000');
  a.page('/');
  a.optOut();
  a.reset();
  const names = calls.map(([name]) => name);
  assert.deepEqual(names, ['init', 'register', 'capture', 'identify', 'capture', 'opt_out_capturing', 'reset', 'reset']);
  assert.equal(calls[0][1], 'phc_test_only');
  assert.deepEqual(calls[1][1], { product: 'trackit' });
  assert.deepEqual(calls[2].slice(1), ['collection_filtered', { filter: 'search', product: 'trackit' }]);
  assert.equal(calls[4][1], '$pageview');
  assert.equal(calls[4][2].$pathname, '/');
});
