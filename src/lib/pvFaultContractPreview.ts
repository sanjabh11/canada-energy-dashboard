import { analyzePvFaultGraph, type PvFaultResult } from './advancedForecasting';
import pvWeights from './modelWeights/pv-gnn-v2.json';

export const PV_FAULT_CONTRACT_PREVIEW_SCENARIO = {
  nodes: [
    { id: 'pv-a', expectedOutputMw: 2.4, observedOutputMw: 1.2, voltageV: 545, inverterTempC: 61, irradiance: 780 },
    { id: 'pv-b', expectedOutputMw: 2.2, observedOutputMw: 2.1, voltageV: 598, inverterTempC: 44, irradiance: 760 },
    { id: 'pv-c', expectedOutputMw: 2.1, observedOutputMw: 0.2, voltageV: 504, inverterTempC: 79, irradiance: 640, offline: true },
  ],
  edges: [
    { fromNodeId: 'pv-a', toNodeId: 'pv-b', weight: 1 },
    { fromNodeId: 'pv-b', toNodeId: 'pv-c', weight: 1 },
  ],
} as const;

export function buildPvFaultContractPreview(): PvFaultResult {
  return analyzePvFaultGraph({
    nodes: PV_FAULT_CONTRACT_PREVIEW_SCENARIO.nodes.map((node) => ({ ...node })),
    edges: PV_FAULT_CONTRACT_PREVIEW_SCENARIO.edges.map((edge) => ({ ...edge })),
    trainedWeights: pvWeights as any,
  });
}
