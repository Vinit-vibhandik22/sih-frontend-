/**
 * check-store-selectors.mjs
 *
 * Guards one invariant: a zustand selector must not allocate.
 *
 * Zustand compares snapshots by reference, so `useSomeStore((s) => Object.values(s.x))`
 * hands React a brand-new array on every read and the commit-phase snapshot check
 * never settles — "Maximum update depth exceeded", an infinite render loop that
 * TypeScript cannot see. Wrapping the selector in `useShallow` fixes it.
 *
 * This scan is the regression check for that class of bug. Run it directly:
 *   node scripts/check-store-selectors.mjs
 * Exits 1 and prints file:line for every unwrapped allocating selector.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** `useAnythingStore(` / `useStore(` followed by an arrow-function selector. */
const SELECTOR = /use\w*Store\(\s*(\(?\w*\)?\s*=>[^\n]*)/g;

/** Expressions that produce a fresh reference every time they are evaluated. */
const ALLOCATES = /Object\.(values|keys|entries)\(|\.(map|filter|slice|concat|sort)\(|=>\s*[[{]/;

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

const offenders = [];

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');

  for (const match of text.matchAll(SELECTOR)) {
    const selector = match[1];
    if (!ALLOCATES.test(selector)) continue;
    // `useShallow(...)` sits between the hook and the selector, so the wrapped
    // form never matches SELECTOR — reaching here means it is unwrapped.
    const line = text.slice(0, match.index).split('\n').length;
    offenders.push(`${relative(SRC, file)}:${line}: ${lines[line - 1].trim()}`);
  }
}

if (offenders.length > 0) {
  console.error('Allocating zustand selector(s) — wrap in useShallow:\n');
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}

console.log('OK: no allocating zustand selectors.');
