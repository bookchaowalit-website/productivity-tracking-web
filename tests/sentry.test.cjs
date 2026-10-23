const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { loadRoute } = require('./helpers/load-route.cjs');

// SPEC-002 AC-02/AC-03: Sentry reports errors only and never ships user data.
const { route: sentry } = loadRoute('src/lib/sentry.ts');

describe('sentryOptions', () => {
  test('stays disabled when no DSN is configured', () => {
    assert.equal(sentry.sentryOptions(undefined).enabled, false);
    assert.equal(sentry.sentryOptions('').enabled, false);
  });

  test('reports errors only: no PII, tracing, trace headers, breadcrumbs or transactions', () => {
    const options = sentry.sentryOptions('https://key@o0.ingest.sentry.io/1');
    assert.equal(options.enabled, true);
    assert.equal(options.sendDefaultPii, false);
    assert.equal(options.tracesSampleRate, undefined);
    assert.deepEqual(options.tracePropagationTargets, []);
    assert.equal(options.maxBreadcrumbs, 0);
    assert.equal(options.beforeSendTransaction(), null);
    assert.equal(options.beforeSend, sentry.scrubEvent);
  });
});

describe('scrubEvent', () => {
  test('drops request data, user, breadcrumbs and extra context but keeps the error', () => {
    const event = sentry.scrubEvent({
      message: 'boom',
      request: { url: 'https://tracking.bookchaowalit.com/api/tracking?q=private', headers: { cookie: 'next-auth.session-token=s' } },
      user: { ip_address: '1.2.3.4', email: 'x@example.com' },
      breadcrumbs: [{ message: 'clicked' }],
      extra: { body: '{"title":"private note"}' },
    });
    assert.equal(event.message, 'boom');
    for (const key of ['request', 'user', 'breadcrumbs', 'extra']) assert.equal(key in event, false, key);
  });

  test('drops the request path that captureRequestError adds and strips query strings', () => {
    const event = sentry.scrubEvent({
      transaction: 'GET /api/tracking?search=private&userId=u1',
      tags: { url: 'https://tracking.bookchaowalit.com/api/tracking?search=private', route: '/api/tracking?search=private' },
      contexts: {
        nextjs: { request_path: '/api/tracking?search=private', router_kind: 'App Router', route_type: 'route' },
        trace: { trace_id: 't' },
        runtime: { name: 'node' },
      },
    });
    assert.equal(event.transaction, 'GET /api/tracking');
    assert.deepEqual(event.tags, { route: '/api/tracking' });
    assert.deepEqual(event.contexts, { runtime: { name: 'node' } });
    assert.equal(JSON.stringify(event).includes('private'), false);
  });

  test('strips query strings and hashes from URLs in messages, frames and debug images', () => {
    const event = sentry.scrubEvent({
      exception: {
        values: [{
          value: 'Failed to fetch https://tracking.bookchaowalit.com/api/tracking?search=private (from /?q=private#frag)',
          stacktrace: { frames: [{ filename: 'https://tracking.bookchaowalit.com/app.js?v=private', abs_path: '/?q=private' }] },
        }],
      },
      debug_meta: { images: [{ code_file: 'https://tracking.bookchaowalit.com/chunk.js?private=1' }] },
    });
    const value = event.exception.values[0];
    assert.equal(value.value, 'Failed to fetch https://tracking.bookchaowalit.com/api/tracking (from /)');
    assert.deepEqual(value.stacktrace.frames[0], { filename: 'https://tracking.bookchaowalit.com/app.js', abs_path: '/' });
    assert.equal(event.debug_meta.images[0].code_file, 'https://tracking.bookchaowalit.com/chunk.js');
    assert.equal(JSON.stringify(event).includes('private'), false);
  });

  test('removes local variables from every stack frame', () => {
    const event = sentry.scrubEvent({
      exception: {
        values: [
          { type: 'Error', stacktrace: { frames: [{ function: 'f', vars: { password: 'p' } }, { function: 'g', vars: { notes: 'n' } }] } },
          { type: 'TypeError' },
        ],
      },
    });
    const frames = event.exception.values[0].stacktrace.frames;
    assert.deepEqual(frames.map((f) => f.function), ['f', 'g']);
    assert.ok(frames.every((f) => !('vars' in f)));
  });
});
