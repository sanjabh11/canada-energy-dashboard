export const REQUIRED_PACKET_FILES: readonly string[];

export type StagingPacketTexts = Record<string, string>;

export type StagingPacketResult = {
  ok: boolean;
  mode: 'template' | 'owner-data';
  checks: string[];
  errors: string[];
};

export function validateStagingPacketTexts(
  packets: StagingPacketTexts,
): StagingPacketResult;

export function readStagingPacketTexts(
  root?: string,
): StagingPacketTexts;
