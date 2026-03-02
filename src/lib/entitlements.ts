export type CanonicalTier = 'free' | 'basic' | 'pro' | 'team';

export const TIER_ORDER: Record<CanonicalTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  team: 3,
};

const TIER_ALIAS_MAP: Record<string, CanonicalTier> = {
  free: 'free',
  guest: 'free',

  basic: 'basic',
  watchdog: 'basic',
  base: 'basic',
  consumer: 'basic',

  pro: 'pro',
  advanced: 'pro',
  edubiz: 'pro',
  professional: 'pro',

  team: 'team',
  enterprise: 'team',
  business: 'team',
};

export const DEFAULT_PRODUCT_TIER_MAP: Record<string, CanonicalTier> = {
  pass_WATCHDOG_PRODUCT_ID: 'basic',
  pass_BASIC_PRODUCT_ID: 'basic',
  pass_PRO_PRODUCT_ID: 'pro',
  pass_TEAM_PRODUCT_ID: 'team',
  prod_basic: 'basic',
  prod_pro: 'pro',
  prod_team: 'team',
};

export function normalizeTier(tier: string | null | undefined): CanonicalTier {
  if (!tier) return 'free';
  const normalized = tier.trim().toLowerCase();
  return TIER_ALIAS_MAP[normalized] || 'free';
}

export function hasTierAccess(
  userTier: CanonicalTier | string | null | undefined,
  requiredTier: CanonicalTier
): boolean {
  const normalizedUserTier = normalizeTier(userTier);
  return TIER_ORDER[normalizedUserTier] >= TIER_ORDER[requiredTier];
}

export function getTierDisplayName(tier: CanonicalTier): string {
  switch (tier) {
    case 'basic':
      return 'Basic';
    case 'pro':
      return 'Pro';
    case 'team':
      return 'Team';
    default:
      return 'Free';
  }
}

export function getTierPrice(tier: CanonicalTier): number {
  switch (tier) {
    case 'basic':
      return 29;
    case 'pro':
      return 99;
    case 'team':
      return 299;
    default:
      return 0;
  }
}

export function parseProductTierMap(rawMap: string | undefined | null): Record<string, CanonicalTier> {
  if (!rawMap) {
    return { ...DEFAULT_PRODUCT_TIER_MAP };
  }

  try {
    const parsed = JSON.parse(rawMap) as Record<string, string>;
    const resolved: Record<string, CanonicalTier> = { ...DEFAULT_PRODUCT_TIER_MAP };
    Object.entries(parsed).forEach(([productId, tier]) => {
      resolved[productId] = normalizeTier(tier);
    });
    return resolved;
  } catch {
    return { ...DEFAULT_PRODUCT_TIER_MAP };
  }
}

export function resolveTierFromProduct(
  productId: string | null | undefined,
  productTierMap: Record<string, CanonicalTier> = DEFAULT_PRODUCT_TIER_MAP
): CanonicalTier {
  if (!productId) return 'free';
  return productTierMap[productId] || 'free';
}

export function maxTier(tiers: Array<CanonicalTier | string | null | undefined>): CanonicalTier {
  return tiers
    .map((tier) => normalizeTier(tier))
    .sort((a, b) => TIER_ORDER[b] - TIER_ORDER[a])[0] || 'free';
}
