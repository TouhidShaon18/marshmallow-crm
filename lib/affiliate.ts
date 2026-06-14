// Client-safe helpers for the affiliate commission module. No server imports.

export const AFFILIATE_PLATFORMS = [
  "Instagram", "TikTok", "YouTube", "Facebook", "X / Twitter", "Blog", "Other",
] as const;

export type TierLike = {
  id: string;
  label: string;
  minAmount: number;
  maxAmount: number | null;
  percent: number;
};

// Suggested starter brackets (admin edits the percentages).
export const DEFAULT_TIERS: { label: string; minAmount: number; maxAmount: number | null; percent: number }[] = [
  { label: "Under ৳3,000",      minAmount: 0,      maxAmount: 3000,   percent: 10 },
  { label: "৳3,000 – ৳10,000",  minAmount: 3000,   maxAmount: 10000,  percent: 8  },
  { label: "৳10,000 – ৳20,000", minAmount: 10000,  maxAmount: 20000,  percent: 7  },
  { label: "৳20,000 – ৳50,000", minAmount: 20000,  maxAmount: 50000,  percent: 6  },
  { label: "৳50,000 – ৳100,000",minAmount: 50000,  maxAmount: 100000, percent: 5  },
  { label: "৳100,000+",         minAmount: 100000, maxAmount: null,   percent: 4  },
];

export function taka(n: number): string {
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return `৳${r.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

/** Find the tier whose [minAmount, maxAmount) bracket contains the amount. */
export function matchTier<T extends { minAmount: number; maxAmount: number | null }>(
  tiers: T[],
  amount: number,
): T | null {
  let match: T | null = null;
  for (const t of tiers) {
    const okMin = amount >= t.minAmount;
    const okMax = t.maxAmount == null || amount < t.maxAmount;
    if (okMin && okMax) {
      // prefer the most specific (highest minAmount) matching bracket
      if (!match || t.minAmount > match.minAmount) match = t;
    }
  }
  return match;
}

/** Commission amount for an order, rounded to 2 dp. */
export function commissionFor(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100 * 100) / 100;
}

/**
 * Resolve tier + effective % + commission for an order amount.
 * `overrides` maps tierId → custom percent for a specific creator.
 */
export function resolveCommission(
  tiers: TierLike[],
  amount: number,
  overrides: Record<string, number> = {},
): { tier: TierLike | null; percent: number; commission: number; tierLabel: string } {
  const tier = matchTier(tiers, amount);
  if (!tier) return { tier: null, percent: 0, commission: 0, tierLabel: "—" };
  const percent = overrides[tier.id] ?? tier.percent;
  return { tier, percent, commission: commissionFor(amount, percent), tierLabel: tier.label };
}
