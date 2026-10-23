const assert = require('node:assert/strict');
const { test } = require('node:test');
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
  element.props.onClick();
  assert.equal(opened, 1);
  assert.match(renderToStaticMarkup(element), /Analytics choices/);
});
