/**
 * Base DataStreamer class
 * Minimal stub — the primary streaming implementation is in dataStreamers.ts (BaseDataStreamer).
 * This file exists only to satisfy the import in provincialGenerationStreamer.ts.
 */
export abstract class DataStreamer {
  protected baseUrl = '';
  protected headers: Record<string, string> = {};
}
