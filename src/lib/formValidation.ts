/**
 * Shared form validation utilities for lead intake forms.
 * Used by TIERROICalculator and TIERComplianceLandingPage.
 */

/**
 * RFC 5322 aligned email validation.
 * Rejects: `@`, `a@`, `@b`, strings without a dot after @.
 * Accepts: standard work emails like `user@company.ca`
 */
export function validateEmail(email: string): boolean {
  if (!email || email.length > 320) return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  const atIdx = trimmed.indexOf('@');
  if (atIdx <= 0 || atIdx === trimmed.length - 1) return false;
  if (trimmed.indexOf('@', atIdx + 1) !== -1) return false;
  const domain = trimmed.slice(atIdx + 1);
  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  return true;
}

/**
 * Validates a non-negative integer string.
 * Rejects: empty, negative, floats, non-numeric.
 */
export function validateNonNegInt(value: string): boolean {
  if (!value || !value.trim()) return false;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return false;
  const num = parseInt(trimmed, 10);
  return Number.isInteger(num) && num >= 0;
}

/**
 * Validates a required string is non-empty after trim.
 */
export function validateRequired(value: string | undefined | null): boolean {
  if (!value) return false;
  return value.trim().length > 0;
}
