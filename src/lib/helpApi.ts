// src/lib/helpApi.ts
// Client-side helpers for interacting with the Help Edge Function endpoints
// Provides typed interfaces and error handling
import { getEdgeBaseUrl, getEdgeHeaders } from './config';

export interface HelpManifestItem {
  id: string;
  short_text: string;
}

export interface HelpContent {
  id: string;
  short_text: string;
  body_html: string;
  related_sources?: Array<{name: string; url: string}>;
  last_updated?: string;
}

/**
 * Fetch all help content IDs and their short texts for tooltips
 * This populates quick tooltips without loading full content
 */
export async function fetchHelpManifest(): Promise<HelpManifestItem[]> {
  const base = getEdgeBaseUrl();
  // The Supabase Edge Function is named `help`. It expects paths under `/api/help/*` inside the function.
  // So the full URL is: `${base}/help/api/help/manifest`
  const url = base ? `${base}/help/api/help/manifest` : '/api/help/manifest';
  const response = await fetch(url, {
    headers: getEdgeHeaders()
  });

  if (!response.ok) {
    console.error('Failed to fetch help manifest:', response.status);
    return []; // Return empty array on error to prevent crashes
  }

  const data = await response.json();
  return data.manifest as HelpManifestItem[];
}

/**
 * Fetch detailed help content for a specific ID
 * Returns parsed HTML for easy rendering
 */
export async function fetchHelpById(id: string): Promise<HelpContent | null> {
  const base = getEdgeBaseUrl();
  const url = base ? `${base}/help/api/help/${encodeURIComponent(id)}` : `/api/help/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    headers: getEdgeHeaders()
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.warn(`Help content not found for ID: ${id}`);
      return null;
    }

    console.error(`Failed to fetch help content for ${id}:`, response.status);
    throw new Error(`Help content unavailable for ${id}`);
  }

  const payload = await response.json();
  return payload as HelpContent;
}

/**
 * Cache for help manifest to avoid repeated fetches
 * Can be cleared on page refresh or when needed
 */
let cachedManifest: HelpManifestItem[] | null = null;
let lastManifestFetch = 0;
const MANIFEST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedManifest(): Promise<HelpManifestItem[]> {
  const now = Date.now();

  if (cachedManifest && (now - lastManifestFetch) < MANIFEST_CACHE_DURATION) {
    return cachedManifest;
  }

  cachedManifest = await fetchHelpManifest();
  lastManifestFetch = now;
  return cachedManifest;
}

// Utility to clear cache (useful for development/testing)
export function clearHelpCache(): void {
  cachedManifest = null;
  lastManifestFetch = 0;
}