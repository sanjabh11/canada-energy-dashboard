#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const runner = "/Users/sanjayb/.codex/plugins/cache/local-codex-marketplace/everything-claude-code/1.9.0/skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js";
const command = process.argv[2] || 'status';
const args = process.argv.slice(3);
const result = spawnSync(process.execPath, [runner, command, '--run', __dirname, ...args], {
  stdio: 'inherit'
});
process.exit(result.status || 0);
