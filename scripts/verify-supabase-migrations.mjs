import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.resolve('supabase/migrations');

if (!fs.existsSync(migrationsDir)) {
  console.error('supabase/migrations directory is missing.');
  process.exit(1);
}

const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

if (files.length === 0) {
  console.error('No SQL migrations found in supabase/migrations.');
  process.exit(1);
}

const invalidFiles = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8').trim();
  if (!content) {
    invalidFiles.push(`${file}: empty file`);
    continue;
  }

  if (content.includes('-- noop migration') || content.includes('-- intentionally empty migration')) {
    continue;
  }

  const normalized = content.toLowerCase();
  const hasSqlStatement = ['create ', 'alter ', 'insert ', 'update ', 'delete ', 'drop ', 'comment ', 'grant ']
    .some((token) => normalized.includes(token));

  if (!hasSqlStatement) {
    invalidFiles.push(`${file}: no SQL statement detected`);
  }
}

if (!files.some((file) => file.includes('contact_leads'))) {
  invalidFiles.push('missing expected contact_leads migration');
}

if (invalidFiles.length > 0) {
  console.error('Migration verification failed:');
  for (const entry of invalidFiles) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

console.log(`Verified ${files.length} Supabase migrations.`);
