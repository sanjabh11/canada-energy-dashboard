#!/usr/bin/env node

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const migrationPattern = /^(\d+)_.*\.sql$/;

function main() {
  const entries = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith('.sql'))
    .filter((entry) => statSync(path.join(migrationsDir, entry)).isFile())
    .sort();

  const versions = new Map();

  for (const entry of entries) {
    const match = entry.match(migrationPattern);
    if (!match) {
      continue;
    }

    const version = match[1];
    const bucket = versions.get(version) ?? [];
    bucket.push(entry);
    versions.set(version, bucket);
  }

  const duplicates = [...versions.entries()].filter(([, files]) => files.length > 1);

  if (duplicates.length > 0) {
    console.error('Duplicate Supabase migration versions found:');
    for (const [version, files] of duplicates) {
      console.error(`- ${version}: ${files.join(', ')}`);
    }
    process.exit(1);
  }

  console.log(`Verified ${entries.length} migration files. All version prefixes are unique.`);
}

main();
