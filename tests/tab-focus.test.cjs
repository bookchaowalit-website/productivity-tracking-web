const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// The console theme sets `box-shadow: none` on the active tab, which also removes the
// focus-visible ring of shadcn's TabsTrigger. Tabs must keep a visible outline instead.
const css = fs.readFileSync(path.join(__dirname, '..', 'src/app/globals.css'), 'utf8');

test('console tabs show a focus outline that the active-tab box-shadow reset cannot remove', () => {
  assert.match(css, /\.tracking-console \[role="tab"\]:focus-visible \{ outline: var\(--focus-ring-width\) solid var\(--color-focus\);/);
});
