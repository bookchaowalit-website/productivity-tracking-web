const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { loadRoute } = require('./helpers/load-route.cjs');

// PDPA consent banner: shown only when analytics is configured and no choice
// is stored; declining is as easy as accepting; the provider never renders
// anything while analytics is off.
const jsx = { jsx: ts.JsxEmit.ReactJSX };
const Button = ({ children, variant, size, ...props }) => React.createElement('button', { 'data-variant': variant || 'default', 'data-size': size || 'default', ...props }, children);
const { route: banner } = loadRoute('src/components/analytics/consent-banner.tsx', { '@/components/ui/button': { Button } }, jsx);

test('panel state: hidden when off, banner until a choice, then a small choices link', () => {
  assert.equal(banner.panelState(false, 'unknown', false), 'hidden');
  assert.equal(banner.panelState(false, 'granted', true), 'hidden');
  assert.equal(banner.panelState(true, 'unknown', false), 'banner');
  assert.equal(banner.panelState(true, 'granted', false), 'choices');
  assert.equal(banner.panelState(true, 'denied', false), 'choices');
  assert.equal(banner.panelState(true, 'denied', true), 'banner');
});

test('banner: labelled region, decline and accept side by side with the same size and style', () => {
  const html = renderToStaticMarkup(React.createElement(banner.ConsentBanner, { onAccept() {}, onDecline() {} }));
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Analytics consent"/);
  const buttons = [...html.matchAll(/<button data-variant="([^"]+)" data-size="([^"]+)"[^>]*>([^<]+)<\/button>/g)]
    .map((m) => ({ variant: m[1], size: m[2], label: m[3] }));
  assert.deepEqual(buttons.map((b) => b.label), ['Decline', 'Allow analytics']);
  assert.equal(new Set(buttons.map((b) => b.size)).size, 1, 'same size for both choices');
  assert.equal(new Set(buttons.map((b) => b.variant)).size, 1, 'same style: accepting is not nudged');
  assert.match(html, /PostHog/);
  assert.match(html, /EU/);
  assert.doesNotMatch(html, /checked|by continuing/i, 'no pre-ticked or implied consent');
});

test('buttons call back with the choice', () => {
  const calls = [];
  const element = banner.ConsentBanner({ onAccept: () => calls.push('granted'), onDecline: () => calls.push('denied') });
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.props?.onClick) found.push(node);
    walk(node.props?.children);
  };
  walk(element);
  found.forEach((node) => node.props.onClick());
  assert.deepEqual(calls, ['denied', 'granted']);
});

test('choices link reopens the banner', () => {
  let opened = 0;
  const element = banner.ConsentChoicesLink({ onOpen: () => { opened += 1; } });
  element.props.children.props.onClick();
  assert.equal(opened, 1);
  assert.match(renderToStaticMarkup(element), /Analytics choices/);
});

test('banner sits in the page flow above the content, so it covers nothing', () => {
  const html = renderToStaticMarkup(React.createElement(banner.ConsentBanner, { onAccept() {}, onDecline() {} }));
  const cls = html.match(/role="region"[^>]*class="([^"]+)"|class="([^"]+)"[^>]*role="region"/);
  const classes = (cls[1] || cls[2]).split(/\s+/);
  assert.ok(!classes.includes('fixed') && !classes.includes('absolute') && !classes.includes('sticky'), 'not floating over the page');
  assert.match(html, /flex-row/, 'two choices side by side on every width');
  assert.equal((html.match(/min-h-11/g) || []).length, 2, 'both choices are 44px targets');
  const providers = fs.readFileSync(path.join(__dirname, '..', 'src/app/providers.tsx'), 'utf8');
  assert.ok(providers.indexOf('<AnalyticsProvider />') < providers.indexOf('{children}'), 'banner renders before the page content');
});

test('choices link is a 44px target in the page flow after the content', () => {
  const html = renderToStaticMarkup(React.createElement(banner.ConsentChoicesLink, { onOpen() {} }));
  assert.match(html, /min-h-11/);
  assert.doesNotMatch(html, /\b(fixed|absolute|sticky)\b/, 'not floating over the stats or list');
  const providers = fs.readFileSync(path.join(__dirname, '..', 'src/app/providers.tsx'), 'utf8');
  assert.ok(providers.indexOf('{children}') < providers.indexOf('<ConsentChoicesSlot />'), 'link renders after the page content');
});

test('reopened banner is scrolled into view and focused; a first-visit banner is not', () => {
  const calls = [];
  const el = { scrollIntoView: (o) => calls.push(['scroll', o.block]), focus: (o) => calls.push(['focus', o.preventScroll]) };
  banner.revealBanner(el);
  assert.deepEqual(calls, [['scroll', 'start'], ['focus', true]]);
  assert.equal(banner.revealBanner(null), undefined);
  const reopened = banner.ConsentBanner({ onAccept() {}, onDecline() {}, reveal: true });
  assert.equal(reopened.props.ref, banner.revealBanner);
  assert.equal(reopened.props.tabIndex, -1);
  assert.equal(banner.ConsentBanner({ onAccept() {}, onDecline() {} }).props.ref, undefined);
});
