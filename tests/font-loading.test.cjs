const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'globals.css'), 'utf8');
const layout = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'layout.tsx'), 'utf8');

test('every var(--font-*) used in globals.css is declared by a next/font loader in layout.tsx', () => {
  const fontVariables = new Set(
    [...css.matchAll(/var\((--font-[a-z0-9-]+)\)/g)].map(([, name]) => name),
  );

  assert.ok(fontVariables.size > 0, 'globals.css should use at least one --font-* variable');
  assert.ok(fontVariables.has('--font-geist-mono'), 'globals.css should use --font-geist-mono');

  for (const name of fontVariables) {
    const declaration = new RegExp(`variable:\\s*["']${name}["']`);
    assert.match(layout, declaration, `${name} is used in globals.css but no next/font loader declares it`);
  }
});

test('the Geist Mono variable class is applied to <html>', () => {
  assert.match(layout, /import \{[^}]*\bGeist_Mono\b[^}]*\} from ["']next\/font\/google["']/);
  assert.match(layout, /<html[^>]*className=\{[^}]*geistMono\.variable/);
});
