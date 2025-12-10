/**
 * Auth Components - Centralized exports
 * Updated for Whop integration
 */

export {
    AuthProvider,
    useAuth,
    useHasTier,
    useUserTier,
    useHasFeature,
    useLegacyTier,
    setAuthModalOpener
} from './AuthProvider';
export { AuthModal } from './AuthModal';
export { AuthButton } from './AuthButton';
export { ProtectedRoute, RequiresTier } from './ProtectedRoute';
export { UpgradeModal } from './UpgradeModal';

