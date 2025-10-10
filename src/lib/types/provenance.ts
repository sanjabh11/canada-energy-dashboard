/**
 * Data Provenance System
 * 
 * Tracks data source and quality for transparent award evidence.
 * All metrics must be labeled with provenance for credibility.
 */

export type ProvenanceType = 
  | 'real_stream'       // Live streaming data from ISO feeds
  | 'historical_archive'// Historical backfill from public archives
  | 'proxy_indicative'  // Proxy/indicative values (e.g., price curves)
  | 'simulated'         // Simulated/forecasted values
  | 'mock'              // Mock data for testing
  | 'calibrated';       // Real data with calibration applied

export interface ProvenanceMetadata {
  type: ProvenanceType;
  source: string;           // e.g., "IESO", "AESO", "Open-Meteo", "ECCC"
  timestamp: string;        // When data was recorded
  confidence: number;       // 0-1 confidence score
  completeness?: number;    // 0-1 data completeness (for time series)
  calibrated?: boolean;     // Has calibration been applied?
  calibration_source?: string;
  notes?: string;
}

export interface ProvenanceBadge {
  label: string;
  color: string;
  icon: string;
  description: string;
}

/**
 * Get human-readable badge for provenance type
 */
export function getProvenanceBadge(type: ProvenanceType): ProvenanceBadge {
  const badges: Record<ProvenanceType, ProvenanceBadge> = {
    real_stream: {
      label: 'Real-Time',
      color: 'green',
      icon: '🟢',
      description: 'Live streaming data from grid operator',
    },
    historical_archive: {
      label: 'Historical',
      color: 'blue',
      icon: '📊',
      description: 'Public historical data from ISO archives',
    },
    proxy_indicative: {
      label: 'Indicative',
      color: 'yellow',
      icon: '💡',
      description: 'Proxy values based on typical patterns',
    },
    simulated: {
      label: 'Simulated',
      color: 'purple',
      icon: '🔮',
      description: 'Forecasted or simulated values',
    },
    mock: {
      label: 'Mock',
      color: 'gray',
      icon: '⚙️',
      description: 'Test data for development',
    },
    calibrated: {
      label: 'Calibrated',
      color: 'teal',
      icon: '✅',
      description: 'Real data with quality calibration',
    },
  };

  return badges[type];
}

/**
 * Provenance-aware metric wrapper
 */
export interface ProvenanceMetric<T> {
  value: T;
  provenance: ProvenanceMetadata;
  quality_score?: number;  // Overall quality (0-1)
}

/**
 * Calculate quality score from provenance and completeness
 */
export function calculateQualityScore(metadata: ProvenanceMetadata): number {
  let score = metadata.confidence;

  // Penalize non-real data
  if (metadata.type === 'proxy_indicative') {
    score *= 0.8;
  } else if (metadata.type === 'simulated') {
    score *= 0.7;
  } else if (metadata.type === 'mock') {
    score *= 0.3;
  }

  // Factor in completeness
  if (metadata.completeness !== undefined) {
    score *= metadata.completeness;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Filter metrics by minimum quality threshold
 */
export function filterByQuality<T>(
  metrics: ProvenanceMetric<T>[],
  minQuality: number = 0.7
): ProvenanceMetric<T>[] {
  return metrics.filter(m => {
    const quality = m.quality_score ?? calculateQualityScore(m.provenance);
    return quality >= minQuality;
  });
}

/**
 * Aggregate provenance from multiple sources
 */
export function aggregateProvenance(
  provenances: ProvenanceMetadata[]
): ProvenanceMetadata {
  if (provenances.length === 0) {
    return {
      type: 'mock',
      source: 'unknown',
      timestamp: new Date().toISOString(),
      confidence: 0,
    };
  }

  // Use most credible source
  const sorted = [...provenances].sort((a, b) => {
    const scoreA = calculateQualityScore(a);
    const scoreB = calculateQualityScore(b);
    return scoreB - scoreA;
  });

  const best = sorted[0];
  const avgConfidence = provenances.reduce((sum, p) => sum + p.confidence, 0) / provenances.length;
  const avgCompleteness = provenances
    .filter(p => p.completeness !== undefined)
    .reduce((sum, p) => sum + (p.completeness || 0), 0) / provenances.length;

  return {
    type: best.type,
    source: provenances.map(p => p.source).join(', '),
    timestamp: best.timestamp,
    confidence: avgConfidence,
    completeness: avgCompleteness || undefined,
    notes: `Aggregated from ${provenances.length} sources`,
  };
}

/**
 * Create provenance metadata helper
 */
export function createProvenance(
  type: ProvenanceType,
  source: string,
  confidence: number = 1.0,
  options?: Partial<ProvenanceMetadata>
): ProvenanceMetadata {
  return {
    type,
    source,
    timestamp: new Date().toISOString(),
    confidence: Math.max(0, Math.min(1, confidence)),
    ...options,
  };
}

/**
 * Wrap value with provenance
 */
export function withProvenance<T>(
  value: T,
  provenance: ProvenanceMetadata
): ProvenanceMetric<T> {
  return {
    value,
    provenance,
    quality_score: calculateQualityScore(provenance),
  };
}

/**
 * Check if provenance meets award-grade standards
 */
export function isAwardGrade(metadata: ProvenanceMetadata): boolean {
  // Award-grade requires real or calibrated data with high confidence and completeness
  const validTypes: ProvenanceType[] = ['real_stream', 'historical_archive', 'calibrated'];
  
  if (!validTypes.includes(metadata.type)) {
    return false;
  }

  if (metadata.confidence < 0.7) {
    return false;
  }

  if (metadata.completeness !== undefined && metadata.completeness < 0.95) {
    return false;
  }

  return true;
}

/**
 * Format provenance for display
 */
export function formatProvenance(metadata: ProvenanceMetadata): string {
  const badge = getProvenanceBadge(metadata.type);
  const parts = [
    `${badge.icon} ${badge.label}`,
    `Source: ${metadata.source}`,
  ];

  if (metadata.confidence < 1.0) {
    parts.push(`Confidence: ${(metadata.confidence * 100).toFixed(0)}%`);
  }

  if (metadata.completeness !== undefined) {
    parts.push(`Completeness: ${(metadata.completeness * 100).toFixed(0)}%`);
  }

  return parts.join(' • ');
}
