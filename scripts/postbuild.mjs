#!/usr/bin/env node
/**
 * Post-build step for the dual ESM / CJS dist layout.
 *
 * Without this, the ESM output is not natively resolvable by Node:
 *
 *   1. TypeScript emits `import { ... } from '../errors'` with no `.js` extension
 *      and no expansion of directory imports, which Node's native ESM resolver
 *      rejects with `ERR_UNSUPPORTED_DIR_IMPORT`. This script rewrites every
 *      relative specifier inside `dist/esm/**.js` to add `.js` (for file imports)
 *      or `/index.js` (for directory imports).
 *
 *   2. There is no `"type"` marker, so Node treats the `.js` files as CJS by
 *      default and emits a `MODULE_TYPELESS_PACKAGE_JSON` warning. This script
 *      writes `dist/esm/package.json` with `{"type": "module"}` and
 *      `dist/cjs/package.json` with `{"type": "commonjs"}` so each format is
 *      unambiguously recognized.
 *
 * Bare-specifier dynamic imports (e.g. `import('@aws-sdk/client-secrets-manager')`)
 * are left untouched — only relative specifiers (`./`, `../`) are rewritten.
 *
 * Usage: node scripts/postbuild.mjs <distDir>   (e.g. `node scripts/postbuild.mjs ./dist`)
 */

import fs from 'node:fs';
import path from 'node:path';

const distRoot = path.resolve(process.argv[2] || 'dist');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.endsWith('.js')) return [full];
    return [];
  });
}

function resolveRelative(fromFile, specifier) {
  if (/\.(m?js|cjs|json)$/.test(specifier)) return specifier;
  const fromDir = path.dirname(fromFile);
  const target = path.resolve(fromDir, specifier);
  if (fs.existsSync(target + '.js')) return specifier + '.js';
  if (
    fs.existsSync(target) &&
    fs.statSync(target).isDirectory() &&
    fs.existsSync(path.join(target, 'index.js'))
  ) {
    return specifier.replace(/\/?$/, '/index.js');
  }
  return specifier; // best-effort; leave untouched if we can't resolve
}

const RELATIVE = /(\.{1,2}\/[^'"]*)/;
const STATIC_RE = new RegExp(`\\b(from|import)\\s+(['"])${RELATIVE.source}\\2`, 'g');
const DYNAMIC_RE = new RegExp(`\\bimport\\s*\\(\\s*(['"])${RELATIVE.source}\\1\\s*\\)`, 'g');

function rewriteFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  let updated = original;
  updated = updated.replace(STATIC_RE, (_match, keyword, quote, spec) => {
    return `${keyword} ${quote}${resolveRelative(file, spec)}${quote}`;
  });
  updated = updated.replace(DYNAMIC_RE, (_match, quote, spec) => {
    return `import(${quote}${resolveRelative(file, spec)}${quote})`;
  });
  if (updated !== original) fs.writeFileSync(file, updated);
}

let touched = 0;
const esmRoot = path.join(distRoot, 'esm');
if (fs.existsSync(esmRoot)) {
  for (const file of walk(esmRoot)) {
    const before = fs.readFileSync(file, 'utf8');
    rewriteFile(file);
    if (fs.readFileSync(file, 'utf8') !== before) touched++;
  }
  fs.writeFileSync(
    path.join(esmRoot, 'package.json'),
    JSON.stringify({ type: 'module' }, null, 2) + '\n',
  );
  console.log(`[postbuild] esm: rewrote ${touched} file(s), wrote ${path.relative(process.cwd(), path.join(esmRoot, 'package.json'))}`);
}

const cjsRoot = path.join(distRoot, 'cjs');
if (fs.existsSync(cjsRoot)) {
  fs.writeFileSync(
    path.join(cjsRoot, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2) + '\n',
  );
  console.log(`[postbuild] cjs: wrote ${path.relative(process.cwd(), path.join(cjsRoot, 'package.json'))}`);
}
