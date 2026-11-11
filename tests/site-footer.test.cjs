const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { loadRoute } = require('./helpers/load-route.cjs');

const jsx = { jsx: ts.JsxEmit.ReactJSX };
const { route } = loadRoute('src/components/site-footer.tsx', {}, jsx);
const html = renderToStaticMarkup(React.createElement(route.SiteFooter));

test('footer links back to the hub', () => {
  assert.match(html, /<footer\b/);
  assert.match(html, /<a href="https:\/\/bookchaowalit\.com"[^>]*>[^<]*bookchaowalit\.com/);
  assert.match(html, /<a href="\/more-projects"/);
  assert.match(html, /TrackIt/);
});

test('footer links are 44px targets', () => {
  const links = [...html.matchAll(/<a\b[^>]*class="([^"]*)"[^>]*>/g)];
  assert.ok(links.length > 0, 'footer should have links with classes');
  for (const [, className] of links) {
    assert.match(className, /(?:^|\s)min-h-11(?:\s|$)/);
  }
});

test('layout renders SiteFooter and uses one name and the live URL', () => {
  const layout = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'layout.tsx'), 'utf8');
  assert.match(layout, /<SiteFooter\s*\/>/);
  assert.doesNotMatch(layout, /bookchaowalit-tracking\.vercel\.app/);
  assert.doesNotMatch(layout, /name: 'Tracking'/);
  assert.doesNotMatch(layout, /SearchAction/);
  assert.match(layout, /name: 'TrackIt'/);
  assert.match(layout, /SITE_URL/);
});

test('more-projects uses TrackIt and the live URL', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'more-projects', 'page.tsx'), 'utf8');
  assert.doesNotMatch(page, /bookchaowalit-tracking-frontend\.vercel\.app/);
  assert.doesNotMatch(page, /- Tracking'/);
  assert.match(page, /https:\/\/tracking\.bookchaowalit\.com/);
});
