const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { loadRoute } = require('./helpers/load-route.cjs');

// The event catalog (docs/measurement/EVENTS.md) and the code must agree:
// every listed event has a call site and a test, and the code cannot send an
// event the catalog does not list.
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = read('docs/measurement/EVENTS.md');
const { route: browser } = loadRoute('src/lib/browser-analytics.ts', { './posthog-adapter': { loadPostHog: async () => null } });

const rows = catalog
  .slice(catalog.indexOf('## Events'), catalog.indexOf('## Identity'))
  .split('\n')
  .filter((line) => /^\| `/.test(line))
  .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
const events = rows.map(([name, emittedBy, , , callSite, tests]) => ({
  name: name.replace(/`/g, ''), emittedBy, callFile: callSite.match(/`([^`]+)`/)[1], tests: [...tests.matchAll(/`([^`]+)`/g)].map((m) => m[1]),
}));

test('catalog lists events', () => {
  assert.ok(events.length >= 7);
});

test('every catalog event has a call site that names it', () => {
  for (const event of events) {
    const source = read(event.callFile);
    if (event.name === '$pageview') assert.match(source, /analytics\.page\(/, event.callFile);
    else assert.match(source, new RegExp(`['"]${event.name}['"]`), `${event.name} in ${event.callFile}`);
  }
});

test('every catalog event has a test that names it', () => {
  for (const event of events) {
    assert.ok(event.tests.length > 0, event.name);
    const named = event.tests.some((file) => read(file).includes(event.name === '$pageview' ? 'page' : event.name));
    assert.ok(named, `${event.name} named in ${event.tests.join(', ')}`);
  }
});

test('the code cannot send an event the catalog does not list', () => {
  const listed = new Set(events.map((e) => e.name));
  for (const name of Object.keys(browser.BROWSER_EVENTS)) assert.ok(listed.has(name), `browser ${name}`);
  const server = read('src/lib/analytics.ts');
  const allowList = server.slice(server.indexOf('ALLOWED_PROPERTIES'), server.indexOf('};', server.indexOf('ALLOWED_PROPERTIES')));
  for (const [, name] of allowList.matchAll(/^\s+(\w+):/gm)) assert.ok(listed.has(name), `server ${name}`);
});

test('browser call sites only use catalog events', () => {
  const listed = new Set(events.map((e) => e.name));
  for (const file of ['src/app/page.tsx', 'src/components/analytics/analytics-provider.tsx']) {
    for (const [, name] of read(file).matchAll(/analytics\.track\('([^']+)'/g)) assert.ok(listed.has(name), `${file}: ${name}`);
  }
});

test('dashboard spec: valid JSON, every PostHog KPI has an insight, every event is in the catalog', () => {
  const spec = JSON.parse(read('analytics/posthog/dashboard.json'));
  const listed = new Set(events.map((e) => e.name));
  const kpis = new Set(spec.insights.map((i) => i.kpi).filter(Boolean));
  for (const kpi of ['KPI-L-02', 'KPI-L-04', 'KPI-G-01']) assert.ok(kpis.has(kpi), kpi);
  for (const insight of spec.insights) {
    assert.equal(insight.query.kind, 'HogQLQuery');
    assert.match(insight.query.query, /properties\.product = 'trackit'/, insight.name);
    for (const name of insight.events) assert.ok(listed.has(name), `${insight.name}: ${name}`);
    for (const [, name] of insight.query.query.matchAll(/event = '([^']+)'/g)) assert.ok(listed.has(name), `${insight.name}: ${name}`);
  }
});
