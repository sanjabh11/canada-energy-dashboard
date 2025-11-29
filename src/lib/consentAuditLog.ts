/**
 * Consent Audit Log System
 * 
 * Tracks all consent-related actions for OCAP®/UNDRIP compliance.
 * Addresses Gap #2: Data Governance & FPIC Consent (HIGH Priority)
 * 
 * This provides:
 * - Local audit logging (localStorage for demo)
 * - Consent versioning
 * - Action tracking (grant, revoke, update)
 * - Export for compliance reporting
 * 
 * For production: Replace localStorage with Supabase table:
 * CREATE TABLE consent_audit_log (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT NOT NULL,
 *   action TEXT NOT NULL,
 *   entity_type TEXT NOT NULL,
 *   entity_id TEXT NOT NULL,
 *   consent_version TEXT NOT NULL,
 *   metadata JSONB,
 *   ip_address TEXT,
 *   user_agent TEXT,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 */

import { supabase } from './supabaseClient';

// Consent action types
export type ConsentAction =
  | 'consent_granted'
  | 'consent_revoked'
  | 'consent_updated'
  | 'visibility_changed'
  | 'data_exported'
  | 'data_deleted'
  | 'tek_submitted'
  | 'tek_updated'
  | 'tek_withdrawn'
  | 'project_created'
  | 'project_updated';

// Entity types that can have consent
export type ConsentEntityType =
  | 'indigenous_project'
  | 'tek_entry'
  | 'territory'
  | 'consultation'
  | 'user_data';

// Audit log entry structure
export interface ConsentAuditEntry {
  id: string;
  userId: string;
  action: ConsentAction;
  entityType: ConsentEntityType;
  entityId: string;
  consentVersion: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Current consent version (increment when consent terms change)
export const CURRENT_CONSENT_VERSION = '2025.1.0';

const STORAGE_KEY = 'ceip_consent_audit_log';

/**
 * Get all audit log entries from storage
 */
function getAuditLog(): ConsentAuditEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save audit log to storage
 */
function saveAuditLog(entries: ConsentAuditEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    console.error('Failed to save consent audit log');
  }
}

/**
 * Generate unique ID for audit entries
 */
function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log a consent-related action
 */
export async function logConsentAction(
  userId: string,
  action: ConsentAction,
  entityType: ConsentEntityType,
  entityId: string,
  metadata: Record<string, unknown> = {}
): Promise<ConsentAuditEntry> {
  const entry: ConsentAuditEntry = {
    id: generateId(),
    userId,
    action,
    entityType,
    entityId,
    consentVersion: CURRENT_CONSENT_VERSION,
    metadata,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    createdAt: new Date().toISOString()
  };

  // Save to local storage (for demo)
  const log = getAuditLog();
  log.unshift(entry);
  saveAuditLog(log);

  // Attempt to save to Supabase if available
  try {
    const { error } = await supabase.from('consent_audit_log').insert({
      id: entry.id,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      consent_version: entry.consentVersion,
      metadata: entry.metadata,
      user_agent: entry.userAgent,
      created_at: entry.createdAt
    });
    
    if (error) {
      // Table might not exist yet - that's okay for demo
      console.debug('Supabase audit log insert skipped:', error.message);
    }
  } catch {
    // Supabase not available - local storage is the fallback
  }

  return entry;
}

/**
 * Log consent granted
 */
export async function logConsentGranted(
  userId: string,
  entityType: ConsentEntityType,
  entityId: string,
  consentDetails: {
    consentType: string;
    authority?: string;
    expiresAt?: string;
    documentUrl?: string;
  }
): Promise<ConsentAuditEntry> {
  return logConsentAction(userId, 'consent_granted', entityType, entityId, consentDetails);
}

/**
 * Log consent revoked
 */
export async function logConsentRevoked(
  userId: string,
  entityType: ConsentEntityType,
  entityId: string,
  reason?: string
): Promise<ConsentAuditEntry> {
  return logConsentAction(userId, 'consent_revoked', entityType, entityId, { reason });
}

/**
 * Log visibility change
 */
export async function logVisibilityChanged(
  userId: string,
  entityType: ConsentEntityType,
  entityId: string,
  oldVisibility: string,
  newVisibility: string
): Promise<ConsentAuditEntry> {
  return logConsentAction(userId, 'visibility_changed', entityType, entityId, {
    oldVisibility,
    newVisibility
  });
}

/**
 * Log data export
 */
export async function logDataExported(
  userId: string,
  entityType: ConsentEntityType,
  entityIds: string[],
  format: string
): Promise<ConsentAuditEntry> {
  return logConsentAction(userId, 'data_exported', entityType, entityIds.join(','), {
    entityIds,
    format
  });
}

/**
 * Log TEK entry submission
 */
export async function logTekSubmitted(
  userId: string,
  tekId: string,
  tekTitle: string,
  visibility: string
): Promise<ConsentAuditEntry> {
  return logConsentAction(userId, 'tek_submitted', 'tek_entry', tekId, {
    title: tekTitle,
    visibility
  });
}

/**
 * Log TEK withdrawal
 */
export async function logTekWithdrawn(
  userId: string,
  tekId: string,
  reason?: string
): Promise<ConsentAuditEntry> {
  return logConsentAction(userId, 'tek_withdrawn', 'tek_entry', tekId, { reason });
}

/**
 * Get audit log entries for a specific entity
 */
export function getEntityAuditLog(
  entityType: ConsentEntityType,
  entityId: string
): ConsentAuditEntry[] {
  const log = getAuditLog();
  return log.filter(
    (entry) => entry.entityType === entityType && entry.entityId === entityId
  );
}

/**
 * Get audit log entries for a specific user
 */
export function getUserAuditLog(userId: string): ConsentAuditEntry[] {
  const log = getAuditLog();
  return log.filter((entry) => entry.userId === userId);
}

/**
 * Get all audit log entries
 */
export function getAllAuditLog(): ConsentAuditEntry[] {
  return getAuditLog();
}

/**
 * Export audit log as JSON
 */
export function exportAuditLog(
  filter?: {
    userId?: string;
    entityType?: ConsentEntityType;
    fromDate?: Date;
    toDate?: Date;
  }
): string {
  let log = getAuditLog();

  if (filter) {
    if (filter.userId) {
      log = log.filter((e) => e.userId === filter.userId);
    }
    if (filter.entityType) {
      log = log.filter((e) => e.entityType === filter.entityType);
    }
    if (filter.fromDate) {
      log = log.filter((e) => new Date(e.createdAt) >= filter.fromDate!);
    }
    if (filter.toDate) {
      log = log.filter((e) => new Date(e.createdAt) <= filter.toDate!);
    }
  }

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      consentVersion: CURRENT_CONSENT_VERSION,
      totalEntries: log.length,
      entries: log
    },
    null,
    2
  );
}

/**
 * Export audit log as CSV
 */
export function exportAuditLogCsv(): string {
  const log = getAuditLog();
  const headers = [
    'ID',
    'User ID',
    'Action',
    'Entity Type',
    'Entity ID',
    'Consent Version',
    'Created At',
    'Metadata'
  ];

  const rows = log.map((entry) => [
    entry.id,
    entry.userId,
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.consentVersion,
    entry.createdAt,
    JSON.stringify(entry.metadata)
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
    '\n'
  );
}

/**
 * Clear audit log (for testing only - should not be used in production)
 */
export function clearAuditLog(): void {
  if (process.env.NODE_ENV !== 'production') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Sync local audit log entries to Supabase
 * Useful for batch uploading entries that failed to sync initially
 */
export async function syncAuditLogToSupabase(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const log = getAuditLog();
  const results = { synced: 0, failed: 0, errors: [] as string[] };
  
  for (const entry of log) {
    try {
      const { error } = await supabase.from('consent_audit_log').upsert({
        id: entry.id,
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        consent_version: entry.consentVersion,
        metadata: entry.metadata,
        user_agent: entry.userAgent,
        created_at: entry.createdAt
      }, { onConflict: 'id' });
      
      if (error) {
        results.failed++;
        results.errors.push(`${entry.id}: ${error.message}`);
      } else {
        results.synced++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push(`${entry.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  return results;
}

/**
 * Check if Supabase consent_audit_log table exists and is accessible
 */
export async function checkSupabaseAuditTableStatus(): Promise<{
  available: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('consent_audit_log')
      .select('id')
      .limit(1);
    
    if (error) {
      return {
        available: false,
        message: `Table not accessible: ${error.message}`
      };
    }
    
    return {
      available: true,
      message: 'Supabase consent_audit_log table is available'
    };
  } catch (err) {
    return {
      available: false,
      message: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`
    };
  }
}
