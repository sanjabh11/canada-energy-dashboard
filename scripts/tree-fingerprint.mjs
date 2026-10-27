#!/usr/bin/env node
/**
 * tree-fingerprint.mjs — reproducible working-tree identity.
 *
 * SHA-256 over sha256(file contents) + path for every tracked AND untracked
 * (non-ignored) file. Unlike `git hash-object` over tracked files only, this
 * binds new untracked code (edge functions, tests) to the recorded tree.
 *
 * Secret-bearing names (.env*, *.pem, *.key, basename starting with "env") are
 * excluded by filename so their contents are never hashed or printed; the
 * fingerprint therefore does not cover them — record their existence via
 * `git status` separately.
 *
 * Usage: node scripts/tree-fingerprint.mjs
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const git = (args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
const untracked = git(['status', '--porcelain', '-uall'])
  .split('\n')
  .filter((l) => l.startsWith('??'))
  .map((l) => l.slice(3).trim().replace(/^"|"$/g, ''));

const secretish = (p) => {
  const base = basename(p);
  return base.startsWith('.env') || base.startsWith('env.') || base === 'env' ||
    base.endsWith('.pem') || base.endsWith('.key');
};

const h = createHash('sha256');
let hashed = 0;
let skipped = 0;
for (const f of new Set([...tracked, ...untracked].sort())) {
  if (secretish(f)) { skipped += 1; continue; }
  try {
    if (statSync(f).isDirectory()) { skipped += 1; continue; }
    const fh = createHash('sha256').update(readFileSync(f)).digest('hex');
    h.update(`${fh}  ${f}\n`);
    hashed += 1;
  } catch { skipped += 1; }
}
process.stdout.write(`hashed ${hashed} files, skipped ${skipped} secret/dir entries\n`);
process.stdout.write(`TREE_FINGERPRINT: ${h.digest('hex')}\n`);
