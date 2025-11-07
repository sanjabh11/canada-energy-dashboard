/**
 * Shared Validation Utilities for Edge Functions
 * Prevents SQL injection and invalid parameter attacks
 */

// Valid Canadian provinces and territories
export const VALID_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] as const;

// AI Data Centre statuses
export const VALID_DC_STATUSES = [
  'Proposed',
  'Interconnection Queue',
  'Under Construction',
  'Operational',
  'Commissioning',
  'Decommissioned'
] as const;

// Hydrogen types (colors)
export const VALID_HYDROGEN_COLORS = [
  'Green',    // Renewable electrolysis
  'Blue',     // Natural gas + CCUS
  'Grey',     // Natural gas without CCUS
  'Turquoise', // Methane pyrolysis
  'Pink',     // Nuclear-powered electrolysis
  'White'     // Natural hydrogen deposits
] as const;

// Hydrogen hub types
export const VALID_HUB_TYPES = [
  'Edmonton Hub',
  'Calgary Hub',
  'Medicine Hat Hub',
  'Fort Saskatchewan Hub',
  'Industrial Heartland Hub'
] as const;

// Hydrogen facility statuses
export const VALID_H2_FACILITY_STATUSES = [
  'Proposed',
  'Under Development',
  'Under Construction',
  'Commissioning',
  'Operational',
  'Delayed',
  'Cancelled',
  'Decommissioned'
] as const;

// Critical minerals
export const VALID_CRITICAL_MINERALS = [
  'Lithium',
  'Cobalt',
  'Nickel',
  'Copper',
  'Graphite',
  'Rare Earth Elements',
  'Platinum Group Metals',
  'Manganese',
  'Aluminum',
  'Zinc',
  'Silver',
  'Chromium',
  'Titanium',
  'Vanadium'
] as const;

// Supply chain statuses
export const VALID_SC_STATUSES = [
  'Proposed',
  'Under Construction',
  'Operational',
  'Expansion',
  'Closed'
] as const;

// AESO queue statuses
export const VALID_AESO_STATUSES = [
  'Active',
  'On Hold',
  'Withdrawn',
  'In Service'
] as const;

/**
 * Validate province code
 */
export function validateProvince(input: string | null, defaultValue: string = 'AB'): string {
  if (!input) return defaultValue;

  const province = input.toUpperCase().trim();

  // Security: max length check
  if (province.length > 2) return defaultValue;

  return VALID_PROVINCES.includes(province as any) ? province : defaultValue;
}

/**
 * Validate enum value from allowed list
 */
export function validateEnum<T extends string>(
  input: string | null,
  validValues: readonly T[],
  allowNull: boolean = true
): T | null {
  if (!input && allowNull) return null;
  if (!input && !allowNull) return validValues[0];

  const trimmed = input.trim();

  // Security: max length check (prevent DoS)
  if (trimmed.length > 100) return allowNull ? null : validValues[0];

  return validValues.includes(trimmed as T) ? (trimmed as T) : (allowNull ? null : validValues[0]);
}

/**
 * Validate boolean string
 */
export function validateBoolean(input: string | null, defaultValue: boolean = false): boolean {
  if (!input) return defaultValue;
  const lower = input.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

/**
 * Validate positive integer
 */
export function validatePositiveInt(input: string | null, defaultValue: number, max: number = 1000): number {
  if (!input) return defaultValue;

  const num = parseInt(input, 10);

  if (isNaN(num) || num < 0 || num > max) {
    return defaultValue;
  }

  return num;
}

/**
 * Validate scope parameter (used in minerals API)
 */
export function validateScope(input: string | null): 'national' | 'provincial' | null {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (lower === 'national' || lower === 'provincial') {
    return lower;
  }
  return null;
}

/**
 * CORS configuration helper
 */
export function getCorsHeaders(req: Request) {
  const allowedOrigins = (Deno.env.get('CORS_ALLOWED_ORIGINS') || 'http://localhost:5173').split(',').map(o => o.trim());
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || allowedOrigins[0]) : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  details?: any
) {
  return new Response(
    JSON.stringify({
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
