import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildBenchmarkScenario,
  buildDefaultUtilityBenchmarkInputs,
  buildUtilityMultiDatasetBenchmarkPack,
  householdDemandRecordsToUtilityRows,
  ontarioDemandRecordsToUtilityRows,
  utilityMultiDatasetBenchmarkPackToCsv,
  utilityMultiDatasetBenchmarkPackToMarkdown,
  type PublicHouseholdDemandRecord,
  type PublicOntarioDemandRecord,
  type UtilityBenchmarkDatasetInput,
} from '../src/lib/utilityForecastBenchmarkPack.ts';

function getArg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
}

function writeText(path: string, value: string) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, value);
}

const outDir = resolve(getArg('--out-dir', 'artifacts/utility-forecast-benchmark')!);
const ontarioDemandPath = getArg('--ontario-demand', 'public/data/ontario_demand_sample.json')!;
const householdDemandPath = getArg('--household-demand', 'public/data/hf_electricity_demand_sample.json')!;

const ontarioDemandRecords = readJson<PublicOntarioDemandRecord[]>(ontarioDemandPath);
const householdDemandRecords = readJson<PublicHouseholdDemandRecord[]>(householdDemandPath);

const inputs: UtilityBenchmarkDatasetInput[] = [
  ...buildDefaultUtilityBenchmarkInputs(),
  {
    dataset_id: 'ontario-demand-public-benchmark-sample',
    label: 'Ontario demand public benchmark sample',
    jurisdiction: 'Ontario',
    source_scope: 'public_benchmark_sample',
    source_kind: 'public_enrichment',
    source_file: ontarioDemandPath,
    rows: ontarioDemandRecordsToUtilityRows(ontarioDemandRecords),
    scenario: buildBenchmarkScenario('Ontario'),
  },
];

const householdRows = householdDemandRecordsToUtilityRows(householdDemandRecords);
const householdIntervalCount = new Set(householdRows.map((row) => row.timestamp)).size;
if (householdIntervalCount >= 24 * 21) {
  inputs.push({
    dataset_id: 'household-demand-public-benchmark-sample',
    label: 'Household demand public benchmark sample',
    jurisdiction: 'Ontario',
    source_scope: 'public_benchmark_sample',
    source_kind: 'public_enrichment',
    source_file: householdDemandPath,
    rows: householdRows,
    scenario: buildBenchmarkScenario('Ontario'),
  });
}

const pack = buildUtilityMultiDatasetBenchmarkPack(inputs);

writeText(`${outDir}/utility-forecast-benchmark-pack.json`, `${JSON.stringify(pack, null, 2)}\n`);
writeText(`${outDir}/utility-forecast-benchmark-pack.md`, `${utilityMultiDatasetBenchmarkPackToMarkdown(pack)}\n`);
writeText(`${outDir}/utility-forecast-benchmark-pack.csv`, `${utilityMultiDatasetBenchmarkPackToCsv(pack)}\n`);

console.log(`Utility forecast benchmark pack written to ${outDir}`);
console.log(`Datasets: ${pack.dataset_count}`);
console.log(`Baseline-win count: ${pack.aggregate.baseline_win_count}`);
