/**
 * Auth Adapter - Portability Layer for Identity Providers
 * 
 * WHOP PORTABILITY PATTERN (whop_criterias.md Section 6.1):
 * "Constraint: Do not build the app such that the Whop User ID is the 
 * only identifier. If you do, you cannot migrate to another auth 
 * provider without breaking every foreign key relationship."
 * 
 * This adapter provides:
 * - Standard OAuth interface for multiple providers
 * - Internal user identity abstraction (Shadow User pattern)
 * - Provider-agnostic session management
 */

// ============================================================================
// AUTH ADAPTER INTERFACES
// ============================================================================

export type AuthProvider = 'whop' | 'google' | 'email' | 'guest';

export interface AuthUser {
    id: string;                    // Internal UUID (your system)
    email: string;
    name?: string;
    avatar?: string;
    providers: IdentityLink[];     // All linked providers
    createdAt: string;
    lastLoginAt: string;
}

export interface IdentityLink {
    provider: AuthProvider;
    providerId: string;            // Whop ID, Google ID, etc.
    email?: string;
    linkedAt: string;
}

export interface AuthSession {
    user: AuthUser;
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
    provider: AuthProvider;
}

export interface AuthResult {
    success: boolean;
    session?: AuthSession;
    error?: string;
    requiresVerification?: boolean;
}

export interface IAuthAdapter {
    provider: AuthProvider;

    // OAuth flow
    getLoginUrl(redirectUri?: string): string;
    handleCallback(code?: string): Promise<AuthResult>;

    // Session management
    getSession(): AuthSession | null;
    refreshSession(): Promise<AuthResult>;
    logout(): Promise<void>;

    // User info
    getCurrentUser(): AuthUser | null;
}

// ============================================================================
// IDENTITY STORAGE (Shadow User Pattern)
// ============================================================================

const STORAGE_KEYS = {
    SESSION: 'ceip_auth_session',
    USER: 'ceip_auth_user',
    PROVIDER: 'ceip_auth_provider'
} as const;

/**
 * Generate internal user UUID
 */
function generateUserId(): string {
    return `usr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Link a provider identity to an internal user
 * This is the core of the Shadow User pattern
 */
export function linkIdentity(
    internalUserId: string,
    provider: AuthProvider,
    providerId: string,
    email?: string
): IdentityLink {
    const link: IdentityLink = {
        provider,
        providerId,
        email,
        linkedAt: new Date().toISOString()
    };

    // Store in localStorage (in production, sync to Supabase)
    const linksKey = `ceip_identity_links_${internalUserId}`;
    const stored = localStorage.getItem(linksKey);
    let links: IdentityLink[] = [];

    try {
        links = stored ? JSON.parse(stored) : [];
    } catch {
        links = [];
    }

    // Avoid duplicates
    const existing = links.findIndex(l => l.provider === provider && l.providerId === providerId);
    if (existing >= 0) {
        links[existing] = link;
    } else {
        links.push(link);
    }

    localStorage.setItem(linksKey, JSON.stringify(links));
    return link;
}

/**
 * Find internal user by provider identity
 */
export function findUserByProvider(
    provider: AuthProvider,
    providerId: string
): string | null {
    // In production, query Supabase IdentityProviders table
    // For now, check localStorage
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('ceip_identity_links_'));

    for (const key of allKeys) {
        try {
            const links: IdentityLink[] = JSON.parse(localStorage.getItem(key) || '[]');
            const match = links.find(l => l.provider === provider && l.providerId === providerId);
            if (match) {
                return key.replace('ceip_identity_links_', '');
            }
        } catch {
            continue;
        }
    }

    return null;
}

// ============================================================================
// WHOP AUTH ADAPTER
// ============================================================================

export class WhopAuthAdapter implements IAuthAdapter {
    provider: AuthProvider = 'whop';

    private clientId = import.meta.env.VITE_WHOP_CLIENT_ID || '';

    getLoginUrl(redirectUri?: string): string {
        const redirect = redirectUri || `${window.location.origin}/auth/whop/callback`;

        if (!this.clientId) {
            console.warn('[WhopAuth] No client ID configured');
            return '#';
        }

        return `https://whop.com/oauth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`;
    }

    async handleCallback(code: string): Promise<AuthResult> {
        try {
            // Exchange code for token via backend
            const response = await fetch('/api/auth/whop/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                return { success: false, error: 'Failed to exchange authorization code' };
            }

            const data = await response.json();

            // Check if user exists by Whop ID
            let internalUserId = findUserByProvider('whop', data.user.id);

            // If not, create new internal user (Shadow User pattern)
            if (!internalUserId) {
                internalUserId = generateUserId();
                linkIdentity(internalUserId, 'whop', data.user.id, data.user.email);
            }

            const user: AuthUser = {
                id: internalUserId,
                email: data.user.email || '',
                name: data.user.name,
                providers: [{
                    provider: 'whop',
                    providerId: data.user.id,
                    email: data.user.email,
                    linkedAt: new Date().toISOString()
                }],
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };

            const session: AuthSession = {
                user,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                provider: 'whop'
            };

            this.saveSession(session);

            return { success: true, session };
        } catch (error) {
            return { success: false, error: `Whop OAuth error: ${error}` };
        }
    }

    getSession(): AuthSession | null {
        const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (!stored) return null;

        try {
            const session: AuthSession = JSON.parse(stored);
            if (session.provider !== 'whop') return null;
            return session;
        } catch {
            return null;
        }
    }

    async refreshSession(): Promise<AuthResult> {
        const session = this.getSession();
        if (!session?.refreshToken) {
            return { success: false, error: 'No refresh token' };
        }

        // In production, call Whop refresh endpoint
        return { success: true, session };
    }

    async logout(): Promise<void> {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.USER);
    }

    getCurrentUser(): AuthUser | null {
        const session = this.getSession();
        return session?.user || null;
    }

    private saveSession(session: AuthSession): void {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
        localStorage.setItem(STORAGE_KEYS.PROVIDER, 'whop');
    }
}

// ============================================================================
// GUEST AUTH ADAPTER
// ============================================================================

export class GuestAuthAdapter implements IAuthAdapter {
    provider: AuthProvider = 'guest';

    getLoginUrl(): string {
        return '#guest-login';
    }

    async handleCallback(_code?: string): Promise<AuthResult> {
        const userId = generateUserId();

        const user: AuthUser = {
            id: userId,
            email: '',
            providers: [{
                provider: 'guest',
                providerId: userId,
                linkedAt: new Date().toISOString()
            }],
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        };

        const session: AuthSession = {
            user,
            accessToken: `guest_${userId}`,
            expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days
            provider: 'guest'
        };

        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.PROVIDER, 'guest');

        return { success: true, session };
    }

    getSession(): AuthSession | null {
        const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (!stored) return null;

        try {
            return JSON.parse(stored);
        } catch {
            return null;
        }
    }

    async refreshSession(): Promise<AuthResult> {
        const session = this.getSession();
        if (!session) {
            return { success: false, error: 'No session' };
        }
        return { success: true, session };
    }

    async logout(): Promise<void> {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.PROVIDER);
    }

    getCurrentUser(): AuthUser | null {
        const session = this.getSession();
        return session?.user || null;
    }
}

// ============================================================================
// AUTH ADAPTER FACTORY
// ============================================================================

let currentAdapter: IAuthAdapter | null = null;

/**
 * Get the current auth adapter based on stored provider
 */
export function getAuthAdapter(): IAuthAdapter {
    if (!currentAdapter) {
        const storedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER) as AuthProvider;
        currentAdapter = createAdapter(storedProvider || 'guest');
    }
    return currentAdapter;
}

/**
 * Create adapter for specific provider
 */
export function createAdapter(provider: AuthProvider): IAuthAdapter {
    switch (provider) {
        case 'whop':
            return new WhopAuthAdapter();
        case 'guest':
        default:
            return new GuestAuthAdapter();
    }
}

/**
 * Switch auth provider
 */
export function setAuthProvider(provider: AuthProvider): void {
    localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
    currentAdapter = createAdapter(provider);
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for authentication
 */
export function useAuth() {
    const adapter = getAuthAdapter();
    const session = adapter.getSession();
    const user = adapter.getCurrentUser();

    return {
        user,
        session,
        isAuthenticated: !!session,
        isGuest: adapter.provider === 'guest',
        provider: adapter.provider,

        // Actions
        getLoginUrl: (provider: AuthProvider = 'whop') => createAdapter(provider).getLoginUrl(),
        handleCallback: (code: string, provider: AuthProvider = 'whop') =>
            createAdapter(provider).handleCallback(code),
        logout: () => adapter.logout(),
        loginAsGuest: () => new GuestAuthAdapter().handleCallback(''),

        // Multi-provider support
        linkProvider: (provider: AuthProvider, providerId: string, email?: string) => {
            if (user) {
                linkIdentity(user.id, provider, providerId, email);
            }
        }
    };
}

// ============================================================================
// AUTO-INIT GUEST SESSION
// ============================================================================

/**
 * Ensure there's always a session (guest if not authenticated)
 */
export async function ensureSession(): Promise<AuthSession> {
    const adapter = getAuthAdapter();
    let session = adapter.getSession();

    if (!session) {
        const result = await new GuestAuthAdapter().handleCallback('');
        session = result.session!;
    }

    return session;
}

// Initialize on module load
if (typeof window !== 'undefined') {
    // Auto-create guest session if none exists
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!stored) {
        new GuestAuthAdapter().handleCallback('');
    }
}
