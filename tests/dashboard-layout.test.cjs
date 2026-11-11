const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const css = fs.readFileSync(path.join(__dirname, '..', 'src/app/globals.css'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '..', 'src/app/page.tsx'), 'utf8');
const cssWithoutMedia = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

test('tabs and status filters are 44px at every width', () => {
  assert.match(
    cssWithoutMedia,
    /\.tracking-console \[role="tab"\]\s*,\s*\.tracking-console-status button\s*\{[^}]*min-height:\s*44px/,
  );
});

test('item grid is auto-fill', () => {
  assert.match(css, /\.tracking-results-grid \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(min\(100%, 18rem\), 1fr\)\)/);
  assert.match(page, /tracking-results-grid/);
  assert.doesNotMatch(page, /xl:grid-cols-4/);
});

test('tagline is not hidden on mobile', () => {
  assert.doesNotMatch(css, /\.tracking-console-header p \{ display: none; \}/);
});

test('page uses shared labels and progress', () => {
  assert.match(page, /getProgress\(/);
  assert.match(page, /STATUS_LABELS/);
  assert.doesNotMatch(page, /Plan to Watch|Watching\/Reading|'Watching'/);
});
