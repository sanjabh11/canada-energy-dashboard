#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let skipProbes = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['output'].includes(key)) {
      failures.push(`Unknown option: ${arg}`);
    } else if (!value || value.startsWith('--')) {
      failures.push(`${arg} requires a value.`);
    } else if (values.has(key)) {
      failures.push(`Duplicate option: ${arg}`);
    } else {
      values.set(key, value);
    }
    continue;
  }
  failures.push(`Unexpected positional argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run report:launch-evidence-manifest

Options:
  --output <path>    Write the JSON manifest to a file instead of stdout only.
  --skip-probes      Do not run local readiness probes; used by fast unit tests.
`);
}

if (failures.length > 0) {
  console.error('Launch evidence manifest failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function gitText(commandArgs, fallback = '') {
  const result = run('git', commandArgs);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function packageMetadata() {
  try {
    const data = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    return {
      name: data.name ?? path.basename(repoRoot),
      description: data.description ?? '',
      homepage: data.homepage ?? '',
    };
  } catch {
    return { name: path.basename(repoRoot), description: '', homepage: '' };
  }
}

function parseNumberLine(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(\\d+)`, 'm');
  const match = text.match(pattern);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseGateLine(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, 'm');
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function probeBuyerEvidence() {
  if (skipProbes) {
    return {
      status: 'skipped',
      evidence: 'Probe skipped by --skip-probes; run corepack pnpm run report:buyer-evidence-readiness for current evidence.',
      productionRegisters: null,
      outreachLogs: null,
      confidenceRows: null,
      phaseFGate: 'unknown',
    };
  }
  const result = run(process.execPath, ['scripts/report-buyer-evidence-readiness.mjs']);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return {
    status: result.status === 0 ? 'pass' : 'fail',
    evidence: output.split(/\r?\n/).slice(0, 12).join(' | '),
    productionRegisters: parseNumberLine(output, 'Production pilot evidence registers'),
    outreachLogs: parseNumberLine(output, 'Production outreach response logs'),
    confidenceRows: parseNumberLine(output, 'Confidence-moving register rows'),
    phaseFGate: parseGateLine(output, 'Phase F 95% gate') ?? 'unknown',
  };
}

function probeUnmergedBranches() {
  if (skipProbes) {
    return {
      status: 'skipped',
      evidence: 'Probe skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness for current branch queue.',
      highRisk: null,
      mediumRisk: null,
      lowRisk: null,
    };
  }
  const result = run(process.execPath, ['scripts/report-unmerged-branch-readiness.mjs', '--max-files', '6']);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return {
    status: result.status === 0 ? 'pass' : 'fail',
    evidence: output.split(/\r?\n/).slice(0, 18).join(' | '),
    highRisk: parseNumberLine(output, '- High-risk branches'),
    mediumRisk: parseNumberLine(output, '- Medium-risk branches'),
    lowRisk: parseNumberLine(output, '- Low-risk branches'),
  };
}

function gitStatusSummary() {
  const short = gitText(['status', '--porcelain=v1']);
  const dirtyLines = short.split(/\r?\n/).filter(Boolean);
  return {
    branch: gitText(['branch', '--show-current'], 'unknown'),
    commit: gitText(['rev-parse', '--short', 'HEAD'], 'unknown'),
    dirtyLines,
    isDirty: dirtyLines.length > 0,
  };
}

const painPoints = [
  {
    rank: 1,
    pain_point: 'Utilities need scenario-ready demand forecasts tied to planning assumptions, benchmark diagnostics, and regulator-readable exports.',
    affected_buyer: 'Utilities, REAs, planning consultants, and large-load advisors',
    source_evidence: [
      'https://www.ieso.ca/en/Sector-Participants/Planning-and-Forecasting/Annual-Planning-Outlook',
      'https://na.itron.com/products/grid-planning',
    ],
    willingness_to_pay_signal: 'Planning and consultant budgets already fund load-growth, DER, and grid-planning work.',
    repo_proof_fit: '/utility-demand-forecast and /forecast-benchmarking proof-pack routes exist with release-gated tests.',
    confidence: 4,
  },
  {
    rank: 2,
    pain_point: 'Regulatory filing teams still convert forecasts, asset evidence, and reliability narratives into filing-ready schedules manually.',
    affected_buyer: 'OEB/AUC utility regulatory affairs, engineering managers, and utility consultants',
    source_evidence: [
      'https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications',
      'https://www.auc.ab.ca/rules/rule005/',
    ],
    willingness_to_pay_signal: 'Filing-prep work is mandatory, recurring, and commonly supported by consultants.',
    repo_proof_fit: '/regulatory-filing and related proof helpers generate bounded filing-prep artifacts.',
    confidence: 4,
  },
  {
    rank: 3,
    pain_point: 'Forecast reviewers need to see when simple baselines beat model output before trusting planning claims.',
    affected_buyer: 'Forecast reviewers, utility consultants, regulatory analysts, and planning directors',
    source_evidence: [
      'https://robjhyndman.com/publications/another-look-at-measures-of-forecast-accuracy/',
      'https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/conformalprediction.html',
    ],
    willingness_to_pay_signal: 'Buyers pay for defensible planning outputs only when accuracy and uncertainty claims are inspectable.',
    repo_proof_fit: '/forecast-benchmarking, forecast trust helpers, and baseline tests exist.',
    confidence: 4,
  },
  {
    rank: 4,
    pain_point: 'Ontario Class A participants need bounded 5CP risk support without confusing decision support for curtailment instructions or settlement advice.',
    affected_buyer: 'Ontario Class A industrials, energy managers, and peak-response advisors',
    source_evidence: [
      'https://www.ieso.ca/en/Learn/Electricity-Pricing-Explained/Global-Adjustment',
      'https://www.ieso.ca/peaktracker',
    ],
    willingness_to_pay_signal: 'Global Adjustment exposure is cash-sensitive and Ontario-specific.',
    repo_proof_fit: '/ga-ici-5cp has public actuals, source-date checks, and no-savings/no-curtailment guardrails.',
    confidence: 4,
  },
  {
    rank: 5,
    pain_point: 'Prospects hesitate to share utility files before seeing privacy, identifier, formula, and retained-artifact boundaries.',
    affected_buyer: 'Utility privacy, security, procurement, and planning reviewers',
    source_evidence: [
      'https://owasp.org/www-community/attacks/CSV_Injection',
      'https://csrc.nist.gov/pubs/ir/8053/final',
    ],
    willingness_to_pay_signal: 'Privacy and security review can block even small pilots unless data-handling proof is clear.',
    repo_proof_fit: '/byo-csv-proof and retained-artifact helpers keep raw values out of repo evidence.',
    confidence: 4,
  },
  {
    rank: 6,
    pain_point: 'Alberta industrial emitters need source-dated TIER compliance pathway comparisons before finance approves a compliance strategy.',
    affected_buyer: 'Alberta industrial emitters, CFOs, compliance leads, and EPC advisors',
    source_evidence: [
      'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
      'https://www.spglobal.com/energy/en/pricing-benchmarks/our-methodology/subscriber-notes/061125-platts-to-launch-alberta-tier-emission-performance-credit-offset-credit-assessments',
    ],
    willingness_to_pay_signal: 'Annual compliance decisions have direct cash impact and advisory budgets.',
    repo_proof_fit: '/roi-calculator and /credit-banking provide bounded compliance planning packs.',
    confidence: 4,
  },
  {
    rank: 7,
    pain_point: 'Credit holders need allocation, expiry, and liability evidence without the tool implying broker execution or registry certification.',
    affected_buyer: 'Carbon compliance teams, CFOs, and Alberta credit portfolio owners',
    source_evidence: [
      'https://www.alberta.ca/alberta-emission-offset-system',
      'https://www.carbonassessors.com/products/alberta',
    ],
    willingness_to_pay_signal: 'Credit position and expiry decisions affect compliance-year cash planning.',
    repo_proof_fit: '/credit-banking keeps allocation and expiry work bounded to audit support.',
    confidence: 3,
  },
  {
    rank: 8,
    pain_point: 'Smaller utilities need asset-condition evidence before approving replacements, deferments, and reliability investments.',
    affected_buyer: 'Utilities, REAs, municipal utilities, and engineering advisors',
    source_evidence: [
      'https://www.oeb.ca/sites/default/files/OEB%20Filing%20Reqs_Chapter%205_2024_20241209.pdf',
      'https://www.copperleaf.com/why-copperleaf/what-is-asset-investment-planning/',
    ],
    willingness_to_pay_signal: 'Capital planning and reliability reviews already fund asset evidence work.',
    repo_proof_fit: '/asset-health includes CBRM-lite proof-pack workflow and executive export coverage.',
    confidence: 3,
  },
  {
    rank: 9,
    pain_point: 'Utility procurement and security teams need structured diligence evidence before load-history sharing or pilot approval.',
    affected_buyer: 'Utility security, privacy, procurement, and integration reviewers',
    source_evidence: [
      'https://www.oeb.ca/consultations-and-projects/policy-initiatives-and-consultations/electricity-utility-cyber-security',
      'https://supabase.com/docs/guides/database/postgres/row-level-security',
    ],
    willingness_to_pay_signal: 'Security review is a frequent procurement blocker for data-backed utility pilots.',
    repo_proof_fit: '/utility-security and Supabase/client-env guards document repo-backed versus owner-supplied boundaries.',
    confidence: 3,
  },
  {
    rank: 10,
    pain_point: 'Public-sector and commercial energy teams need invoice-delta evidence before trusting bill-audit or switching recommendations.',
    affected_buyer: 'Municipal/public-sector energy managers, commercial operators, and consultants',
    source_evidence: [
      'https://natural-resources.canada.ca/sites/nrcan/files/oee/pdf/publications/infosource/pub/cipec/energyauditmanualandtool.pdf',
      'https://www.energycap.com/utility-bill-energy-management-software/features/utility-bill-auditing-software/',
    ],
    willingness_to_pay_signal: 'Invoice errors and tariff mismatch checks can produce concrete savings findings.',
    repo_proof_fit: '/shadow-billing provides uploaded-bill mode, field map, delta CSV, and savings caveats.',
    confidence: 3,
  },
];

const targetCustomers = [
  {
    rank: 1,
    account_or_segment: 'Small and mid-size Ontario electricity distributors',
    pain: 'Need defensible demand planning, filing evidence, and privacy-safe pilot packaging.',
    trigger: 'Distribution rate filing, load-growth scenario update, or board planning review.',
    decision_maker: 'Planning Director, Regulatory Affairs Director, or VP Engineering',
    outreach_angle: 'One forecast planning pack with benchmark appendix and no unsupported live-utility claim.',
    proof_to_show: '/utility-demand-forecast, /forecast-benchmarking, /regulatory-filing, and /utility-security.',
    confidence: 4,
  },
  {
    rank: 2,
    account_or_segment: 'Ontario Class A industrial energy managers',
    pain: 'Need bounded 5CP exposure support without curtailment or guaranteed savings claims.',
    trigger: 'Peak season planning or GA budget review.',
    decision_maker: 'Energy Manager, Finance Controller, or Operations Director',
    outreach_angle: 'Source-dated 5CP decision-support pack with explicit no-settlement/no-curtailment boundary.',
    proof_to_show: '/ga-ici-5cp and /forecast-benchmarking.',
    confidence: 4,
  },
  {
    rank: 3,
    account_or_segment: 'Alberta industrial TIER compliance teams',
    pain: 'Need CFO-readable pathway comparison across fund, credits, offsets, and direct investment.',
    trigger: 'Annual compliance planning, budget review, or credit purchase discussion.',
    decision_maker: 'CFO, Sustainability Lead, Compliance Director, or Plant Operations Lead',
    outreach_angle: 'Source-dated compliance memo with no legal, tax, broker, or registry-certification claim.',
    proof_to_show: '/roi-calculator and /credit-banking.',
    confidence: 4,
  },
  {
    rank: 4,
    account_or_segment: 'Rural Electrification Associations and municipal utilities',
    pain: 'Need planning, filing, and asset evidence without large enterprise software procurement.',
    trigger: 'Capex review, reliability plan, or filing-prep cycle.',
    decision_maker: 'Utility GM, Asset Manager, Engineering Manager, or Finance Lead',
    outreach_angle: 'CSV-first asset and filing proof pack for one service territory or fleet subset.',
    proof_to_show: '/asset-health, /regulatory-filing, and /utility-demand-forecast.',
    confidence: 3,
  },
  {
    rank: 5,
    account_or_segment: 'Utility planning consultants',
    pain: 'Need repeatable artifacts for forecast, filing, benchmark, and security-review conversations.',
    trigger: 'New client planning study or rate filing support scope.',
    decision_maker: 'Partner, Principal Consultant, or Forecast Practice Lead',
    outreach_angle: 'White-label style proof-pack workflow that reduces manual appendix creation.',
    proof_to_show: '/solutions, /forecast-benchmarking, /regulatory-filing, and export helpers.',
    confidence: 4,
  },
  {
    rank: 6,
    account_or_segment: 'Utility privacy and security reviewers',
    pain: 'Need assurance that buyer files, secrets, and service-role access are bounded before pilot approval.',
    trigger: 'Security questionnaire, data-sharing review, or procurement intake.',
    decision_maker: 'CISO, Privacy Officer, Procurement Lead, or Integration Reviewer',
    outreach_angle: 'Repo-backed security procurement pack plus BYO-CSV retained-extract workflow.',
    proof_to_show: '/utility-security and /byo-csv-proof.',
    confidence: 3,
  },
  {
    rank: 7,
    account_or_segment: 'Municipal and public-sector energy managers',
    pain: 'Need field-map and invoice-delta evidence before investing in shadow billing or audit work.',
    trigger: 'Budget pressure, price review, or energy-audit cycle.',
    decision_maker: 'Facilities Director, Energy Manager, Finance Lead, or Procurement Lead',
    outreach_angle: 'One uploaded-bill comparison proof with energy-supply-only savings caveats.',
    proof_to_show: '/shadow-billing and /byo-csv-proof.',
    confidence: 3,
  },
  {
    rank: 8,
    account_or_segment: 'Alberta compliance advisors and EPCs',
    pain: 'Need source-dated planning packs to support industrial compliance conversations.',
    trigger: 'Compliance-year planning or client advisory engagement.',
    decision_maker: 'Compliance Advisor, EPC Project Lead, or Carbon Market Lead',
    outreach_angle: 'Faster client-facing TIER and credit-banking memo generation with clear boundaries.',
    proof_to_show: '/roi-calculator, /credit-banking, and source-anchor report.',
    confidence: 3,
  },
  {
    rank: 9,
    account_or_segment: 'Large-load and data-centre planning advisors',
    pain: 'Need planning narrative and load-assumption discipline before engineering-grade interconnection work.',
    trigger: 'Early load proposal, planning screen, or service-territory impact discussion.',
    decision_maker: 'Development Director, Planning Advisor, or Utility Interconnection Lead',
    outreach_angle: 'Keep this as a support overlay behind the forecast pack, not a standalone engineering approval claim.',
    proof_to_show: '/ai-datacentres and /utility-demand-forecast.',
    confidence: 2,
  },
  {
    rank: 10,
    account_or_segment: 'Indigenous/community energy project teams with funder reporting needs',
    pain: 'Need repeatable funder reporting artifacts with governance and owner-supplied review boundaries.',
    trigger: 'Quarterly reporting cycle or project funding milestone.',
    decision_maker: 'Energy Manager, Program Manager, or Economic Development Lead',
    outreach_angle: 'Constructed-proof reporting workflow only until a community-reviewed real portfolio exists.',
    proof_to_show: '/funder-reporting and /aicei-reporting support surfaces.',
    confidence: 2,
  },
];

const pkg = packageMetadata();
const gitStatus = gitStatusSummary();
const buyerProbe = probeBuyerEvidence();
const branchProbe = probeUnmergedBranches();
const generatedAt = new Date().toISOString();

const dirtyEvidence = gitStatus.isDirty
  ? `git status --porcelain found ${gitStatus.dirtyLines.length} dirty path(s): ${gitStatus.dirtyLines.join('; ')}`
  : 'git status --porcelain found a clean worktree at manifest generation time';

const buyerGapEvidence = [
  `Production pilot evidence registers: ${buyerProbe.productionRegisters ?? 'unknown'}`,
  `Production outreach response logs: ${buyerProbe.outreachLogs ?? 'unknown'}`,
  `Confidence-moving register rows: ${buyerProbe.confidenceRows ?? 'unknown'}`,
  `Phase F 95% gate: ${buyerProbe.phaseFGate}`,
].join('; ');

const manifest = {
  schema_version: 1,
  repo: {
    name: pkg.name,
    path: repoRoot,
    profile: 'data-app',
    commit: gitStatus.commit,
  },
  run: {
    name: 'ceip-launch-readiness-current-state',
    mode: 'fix-safe',
    research_depth: 'deep',
    worker_mode: 'dry-run',
    generated_at: generatedAt,
  },
  launch_decision: 'blocked',
  scores: {
    security: 3,
    readiness: gitStatus.isDirty ? 3 : 4,
    sellability: 4,
    evidence: 1,
    overall: 2,
  },
  proof_buckets: {
    hosted_live: [],
    local: [
      'Local release readiness is verified separately with corepack pnpm run check:release-readiness; do not infer current deploy approval from this JSON alone.',
      buyerProbe.evidence,
      branchProbe.evidence,
    ],
    repo_artifact: [
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'docs/CEIP_CONVERSATION_OUTCOME_REVIEW_2026-06-03.md',
      'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md',
      'src/lib/commercialPositioning.ts',
      'scripts/report-buyer-evidence-readiness.mjs',
      'scripts/report-production-approval-packet.mjs',
      'scripts/report-unmerged-branch-readiness.mjs',
    ],
    candidate_shadow: [
      '/utility-demand-forecast',
      '/forecast-benchmarking',
      '/regulatory-filing',
      '/ga-ici-5cp',
      '/byo-csv-proof',
      '/roi-calculator',
      '/credit-banking',
      '/asset-health',
      '/utility-security',
      '/shadow-billing',
    ],
    roadmap: [
      'Phase F buyer evidence workspace remains the required path to confidence movement.',
      'High-risk unmerged branches remain review queues until focused checks and owner approvals clear.',
      'Status/advisor automation remains future work until live credentials and connector permissions are available.',
    ],
  },
  gaps: [
    {
      gap: 'No buyer-proven Phase F evidence register or retained redacted buyer artifacts are available in production evidence roots.',
      severity: 'P0',
      evidence: buyerGapEvidence,
      framework_mapping: ['Commercial Launch Evidence Schema: hard buyer evidence gate'],
      buyer_impact: 'Cannot claim buyer-proven 95% market confidence, accepted proof packs, or commercial-ready status.',
      fix: 'Collect real anonymized buyer rows, prepare retained redacted artifacts, update the pilot register, and run validate:pilot-evidence --require-95.',
      status: 'open',
    },
    {
      gap: 'Current source deploy approval is blocked when the worktree is dirty or owner approval is absent.',
      severity: gitStatus.isDirty ? 'P0' : 'P1',
      evidence: dirtyEvidence,
      framework_mapping: ['Release readiness: source deploy provenance', 'NIST SSDF: release integrity'],
      buyer_impact: 'A buyer-facing production release request cannot proceed until source provenance is clean and explicitly approved.',
      fix: 'Commit, stash, or intentionally resolve dirty tracked paths, run release readiness, then request explicit owner approval before deploy.',
      status: gitStatus.isDirty ? 'open' : 'mitigated',
    },
    {
      gap: 'High-risk unmerged branches can affect Supabase, payment, deploy, or buyer-facing surfaces.',
      severity: 'P1',
      evidence: `Unmerged branch probe high/medium/low risk counts: ${branchProbe.highRisk ?? 'unknown'}/${branchProbe.mediumRisk ?? 'unknown'}/${branchProbe.lowRisk ?? 'unknown'}.`,
      framework_mapping: ['NIST SSDF: change review', 'OWASP ASVS: secure deployment verification'],
      buyer_impact: 'Unreviewed branch changes can weaken launch gates, payment boundaries, database security, or claim discipline.',
      fix: 'Run report:unmerged-branch-readiness -- --branch <ref>, complete branch-specific checks, and merge only through normal release gates.',
      status: (branchProbe.highRisk ?? 1) > 0 ? 'open' : 'mitigated',
    },
    {
      gap: 'Supabase security/performance advisor evidence is not embedded in this manifest.',
      severity: 'P1',
      evidence: 'docs/CEIP_CONVERSATION_OUTCOME_REVIEW_2026-06-03.md records Supabase advisor access as an owner-side permission gate.',
      framework_mapping: ['Supabase RLS and service-role review', 'OWASP API security review'],
      buyer_impact: 'Utility security reviewers may ask for current database advisor evidence before sharing sensitive files.',
      fix: 'Reauthorize or repair Supabase advisor access, run security/performance advisor review, and record public-safe findings.',
      status: 'open',
    },
  ],
  pain_points: painPoints,
  target_customers: targetCustomers,
  outreach_plan: {
    phase_30_days: 'Use the Phase F evidence workspace and intake packets for the three minimum lanes: utility forecast, TIER/credit, and billing/security.',
    phase_60_days: 'Convert real anonymized buyer responses into retained redacted artifacts and pilot register rows; keep rehearsal rows at confidence_delta=0.',
    phase_90_days: 'Only after the hard 95% gate passes, refresh launch scores, target ranking, and production approval status.',
    email_script_boundary: 'Use proof-pack-specific outreach only. Do not claim buyer-proven 95% confidence, production utility onboarding, guaranteed savings, or security certification.',
    linkedin_script_boundary: 'Ask for one redacted pilot artifact review, not a purchase claim; route respondents into intake packets.',
    demo_narrative: 'Show repo-backed proof packs, blocked claims, and retained-artifact workflow before asking for buyer data.',
    objection_handling: 'If asked for proof, distinguish hosted/live parity, local release readiness, repo artifacts, constructed demos, and missing buyer evidence.',
  },
  fix_report: {
    files_changed_by_manifest_command: [],
    safe_fix_boundary: 'This manifest command is read-only unless --output is used to write the JSON file.',
    current_required_checks: [
      'corepack pnpm run report:buyer-evidence-readiness',
      'corepack pnpm run report:production-approval-packet',
      'corepack pnpm run report:unmerged-branch-readiness',
      'corepack pnpm run check:release-readiness',
      'python3 /Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py <manifest>',
    ],
    unresolved_blockers: [
      'Real buyer evidence and retained redacted artifacts are absent.',
      'Production deploy still requires clean source provenance and explicit owner approval.',
      'High-risk unmerged branches remain review queues.',
    ],
  },
  adversarial_reviews: [
    {
      lane: 'buyer evidence',
      finding: 'Repo scaffolding and constructed proof packs are not buyer acceptance evidence.',
      decision: 'Keep launch_decision blocked until the hard pilot evidence gate passes.',
    },
    {
      lane: 'production approval',
      finding: 'A passing local release gate does not authorize deployment while source provenance is dirty or owner approval is missing.',
      decision: 'Keep deploy request blocked until provenance and approval gates clear.',
    },
    {
      lane: 'branch risk',
      finding: 'Unmerged branches are not launch evidence; they can only become merge candidates after focused review and release gates.',
      decision: 'Keep high-risk branches in review queue.',
    },
  ],
  ecc_ledger: {
    route: 'commercial-launch-readiness-orchestrator',
    tier: 1,
    mode: 'normal PhaseLoop',
    skills_tools: ['commercial-launch-readiness-orchestrator', 'dynamic-workflow-backlog automode --dry-run'],
    baseline: 'CEIP has strong repo/local proof scaffolding but missing buyer evidence and blocked deploy provenance.',
    checks: skipProbes
      ? ['git status --porcelain=v1', 'git rev-parse --short HEAD']
      : [
          'git status --porcelain=v1',
          'git rev-parse --short HEAD',
          'node scripts/report-buyer-evidence-readiness.mjs',
          'node scripts/report-unmerged-branch-readiness.mjs --max-files 6',
        ],
    delta: 'Generated a schema-shaped launch evidence manifest with conservative blocked decision.',
    reflection: 'The manifest improves handoff and portfolio comparability without changing buyer confidence.',
    decision: 'blocked',
    next_adjustment: 'Resolve source provenance or collect real Phase F buyer evidence; do not raise launch status from repo artifacts alone.',
  },
};

const json = `${JSON.stringify(manifest, null, 2)}\n`;
const outputPath = values.get('output');
if (outputPath) {
  const absoluteOutput = path.resolve(repoRoot, outputPath);
  if (existsSync(absoluteOutput) && !absoluteOutput.endsWith('.json')) {
    console.error('Launch evidence manifest failed:\n');
    console.error(`- Refusing to overwrite non-JSON output path: ${outputPath}`);
    process.exit(1);
  }
  writeFileSync(absoluteOutput, json, 'utf8');
}

process.stdout.write(json);
