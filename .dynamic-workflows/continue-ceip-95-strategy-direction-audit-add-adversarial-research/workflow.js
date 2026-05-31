#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const runner = "/Users/sanjayb/.codex/plugins/cache/local-codex-marketplace/everything-claude-code/1.9.0/skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js";
const command = process.argv[2] || 'status';
const args = process.argv.slice(3);
const runDir = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [runner, command, '--run', runDir, ...args], {
  stdio: 'inherit'
});
process.exit(result.status || 0);
