#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function loadDotEnvLocal() {
  const envPath = path.join(projectRoot, '.env.local');
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || rest.length === 0) continue;
    if (!process.env[key]) {
      process.env[key] = rest.join('=').trim();
    }
  }
}

function fmtPercent(numerator, denominator) {
  if (!denominator) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

loadDotEnvLocal();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const since = new Date();
  since.setDate(since.getDate() - 56); // 8 weeks

  const { data, error } = await supabase
    .from('gtm_weekly_funnel_summary')
    .select('*')
    .gte('week_start', since.toISOString().slice(0, 10))
    .order('week_start', { ascending: false });

  if (error) {
    console.error('Failed to query gtm_weekly_funnel_summary:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No weekly GTM rows found for the last 8 weeks.');
    return;
  }

  console.log('\nCEIP Weekly GTM Funnel Summary (Last 8 Weeks)\n');
  console.log([
    'week_start'.padEnd(12),
    'channel'.padEnd(8),
    'segment'.padEnd(18),
    'campaign'.padEnd(22),
    'views'.padStart(6),
    'ctas'.padStart(6),
    'submit_cta'.padStart(11),
    'leads'.padStart(6),
    'cta->lead'.padStart(10),
  ].join(' | '));
  console.log('-'.repeat(120));

  for (const row of data) {
    const ctaToLead = fmtPercent(row.lead_submissions ?? 0, row.cta_clicks ?? 0);
    console.log([
      String(row.week_start ?? '').padEnd(12),
      String(row.channel ?? '').padEnd(8),
      String(row.segment ?? '').padEnd(18),
      String(row.campaign_id ?? '').slice(0, 22).padEnd(22),
      String(row.route_views ?? 0).padStart(6),
      String(row.cta_clicks ?? 0).padStart(6),
      String(row.submit_cta_clicks ?? 0).padStart(11),
      String(row.lead_submissions ?? 0).padStart(6),
      ctaToLead.padStart(10),
    ].join(' | '));
  }

  const flags = [];
  for (const row of data) {
    const views = row.route_views ?? 0;
    const ctas = row.cta_clicks ?? 0;
    const submitCtas = row.submit_cta_clicks ?? 0;
    const leads = row.lead_submissions ?? 0;

    if (views >= 20 && ctas === 0) {
      flags.push(`Message friction: ${row.channel}/${row.segment}/${row.campaign_id} has ${views} views and 0 CTAs.`);
    }
    if (ctas >= 20 && leads === 0) {
      flags.push(`Handoff failure: ${row.channel}/${row.segment}/${row.campaign_id} has ${ctas} CTAs and 0 leads.`);
    }
    if (submitCtas >= 5 && leads === 0) {
      flags.push(`Form persistence risk: ${row.channel}/${row.segment}/${row.campaign_id} has ${submitCtas} submit CTAs and 0 persisted leads.`);
    }
  }

  console.log('\nStop-Rule Flags');
  if (flags.length === 0) {
    console.log('- None triggered.');
  } else {
    for (const flag of flags) {
      console.log(`- ${flag}`);
    }
  }
}

main().catch((error) => {
  console.error('Unexpected error running GTM weekly report:', error);
  process.exit(1);
});
