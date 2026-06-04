import manifest from './publicReleaseStatusManifest.json';

export type PublicReleaseStatus = 'verified' | 'watch' | 'external_gate' | 'needs_remediation';

export interface PublicReleaseStatusManifestItem {
  id: string;
  label: string;
  status: PublicReleaseStatus;
  proofBucket: string;
  command: string;
  evidenceBoundary: string;
  nextAction: string;
}

export interface PublicReleaseStatusManifest {
  schemaVersion: string;
  generatedBy: string;
  publicPath: string;
  lastMaterialReviewDate: string;
  decision: 'blocked' | 'pilot-only' | 'sellable-with-caveats' | 'commercial-ready';
  decisionBoundary: string;
  refreshCommands: string[];
  items: PublicReleaseStatusManifestItem[];
}

export const PUBLIC_RELEASE_STATUS_MANIFEST = manifest as PublicReleaseStatusManifest;
