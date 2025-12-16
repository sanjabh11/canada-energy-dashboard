/**
 * Trial Access Utility
 * 
 * Provides trial access detection for Whop reviewers.
 * Activated via ?trial=true URL parameter.
 * Grants 7-day Pro access without authentication.
 */

const TRIAL_STORAGE_KEY = 'ceip_trial_start';
const TRIAL_DURATION_DAYS = 7;

/**
 * Check if trial mode is activated via URL param
 */
export function detectTrialFromUrl(): boolean {
    if (typeof window === 'undefined') return false;

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('trial') === 'true';
}

/**
 * Activate trial mode by storing start date
 */
export function activateTrial(): void {
    if (typeof window === 'undefined') return;

    const now = new Date().toISOString();
    localStorage.setItem(TRIAL_STORAGE_KEY, now);
}

/**
 * Check if user has active trial
 */
export function hasActiveTrial(): boolean {
    if (typeof window === 'undefined') return false;

    const trialStart = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (!trialStart) return false;

    const startDate = new Date(trialStart);
    const now = new Date();
    const daysPassed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysPassed < TRIAL_DURATION_DAYS;
}

/**
 * Get trial days remaining
 */
export function getTrialDaysRemaining(): number {
    if (typeof window === 'undefined') return 0;

    const trialStart = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (!trialStart) return 0;

    const startDate = new Date(trialStart);
    const now = new Date();
    const daysPassed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const remaining = TRIAL_DURATION_DAYS - daysPassed;

    return Math.max(0, Math.ceil(remaining));
}

/**
 * Initialize trial if ?trial=true is in URL
 * Returns true if trial was just activated
 */
export function initializeTrialFromUrl(): boolean {
    if (detectTrialFromUrl()) {
        if (!hasActiveTrial()) {
            activateTrial();
            return true;
        }
    }
    return false;
}

/**
 * Check if premium features should be unlocked
 * (active trial OR paid user)
 */
export function hasPremiumAccess(): boolean {
    // For now, just check trial status
    // In production, this would also check Whop tier
    return hasActiveTrial();
}

/**
 * Clear trial (for testing)
 */
export function clearTrial(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TRIAL_STORAGE_KEY);
}
