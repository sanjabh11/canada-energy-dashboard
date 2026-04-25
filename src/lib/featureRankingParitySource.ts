import type { FeatureRankingParityArtifact } from './featureRankingBenchmark';

export interface FeatureRankingParityViewModel {
  artifact: FeatureRankingParityArtifact | null;
  available: boolean;
  statusLabel: string;
}

export async function fetchFeatureRankingParitySummary(): Promise<FeatureRankingParityViewModel> {
  try {
    const response = await fetch('/data/feature-ranking-parity-summary.json');
    if (!response.ok) {
      return {
        artifact: null,
        available: false,
        statusLabel: 'artifact not uploaded yet',
      };
    }

    const artifact = await response.json() as FeatureRankingParityArtifact;
    return {
      artifact,
      available: true,
      statusLabel: artifact.parityPassed ? 'aligned parity passed' : 'aligned parity below floor',
    };
  } catch {
    return {
      artifact: null,
      available: false,
      statusLabel: 'artifact not uploaded yet',
    };
  }
}
