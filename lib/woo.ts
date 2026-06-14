import "server-only";

import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/nuport-sync";
import { resolveCommission, type TierLike } from "@/lib/affiliate";

// Setting keys
const K_URL     = "woo_store_url";
const K_KEY     = "woo_consumer_key";
const K_SECRET  = "woo_consumer_secret";
const K_ENABLED = "woo_sync_enabled";
const K_LAST    = "woo_last_sync";

export type WooSettings = {
  storeUrl: string | null;
  hasKey: boolean;
  maskedKey: string | null;
  enabled: boolean;
  lastSync: string | null;
};

export async function getWooSettings(): Promise<WooSettings> {
  const [storeUrl, key, secret, enabled, lastSync] = await Promise.all([
    getSetting(K_URL), getSetting(K_KEY), getSetting(K_SECRET), getSetting(K_ENABLED), getSetting(K_LAST),
  ]);
  return {
    storeUrl,
    hasKey: !!(key && secret),
    maskedKey: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null,
    enabled: enabled === "true",
    lastSync,
  };
}

export type WooSyncResult = {
  ok: boolean;
  message: string;
  ordersScanned?: number;
  created?: number;
  skippedNoCoupon?: number;
};

// Minimal shapes of the WooCommerce REST payloads we read.
type WooLineItem = { id: number; name: string; product_id: number; total: string };
type WooCoupon = { code: string };
type WooOrder = {
  id: number;
  number: string;
  status: string;
  date_created_gmt: string;
  date_completed_gmt: string | null;
  coupon_lines: WooCoupon[];
  line_items: WooLineItem[];
};
type WooProduct = { id: number; categories: { name: string }[] };

function authHeader(key: string, secret: string) {
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

/**
 * Pull newly-completed WooCommerce orders and turn each coupon-attributed line
 * item into an AffiliateSale. Split per line item: each product line is matched
 * to its own category + price bracket. Deduped by externalId = woo-{order}-{line}.
 */
export async function syncWooCommerce(): Promise<WooSyncResult> {
  const [rawUrl, key, secret, enabled] = await Promise.all([
    getSetting(K_URL), getSetting(K_KEY), getSetting(K_SECRET), getSetting(K_ENABLED),
  ]);

  if (enabled !== "true") return { ok: false, message: "WooCommerce sync is disabled." };
  if (!rawUrl || !key || !secret) return { ok: false, message: "WooCommerce store URL / API keys are not set." };

  const base = rawUrl.replace(/\/+$/, "");
  const auth = authHeader(key, secret);

  const tiers = (await prisma.commissionTier.findMany({ orderBy: { minAmount: "asc" } })) as TierLike[];
  if (tiers.length === 0) return { ok: false, message: "Set up commission tiers before syncing." };

  // Coupon → affiliate (with overrides) lookup.
  const affiliates = await prisma.affiliate.findMany({ include: { overrides: true } });
  const byCoupon = new Map(affiliates.map((a) => [a.couponCode.toUpperCase(), a]));
  if (byCoupon.size === 0) return { ok: false, message: "Add at least one creator (coupon) before syncing." };

  // Only look at orders changed since the last successful sync (first run: 60 days back).
  const lastSync = await getSetting(K_LAST);
  const since = lastSync ?? new Date(Date.now() - 60 * 86_400_000).toISOString();
  const runStartedAt = new Date().toISOString();

  const productCatCache = new Map<number, string>();
  const tierCatNames = new Set(tiers.map((t) => (t.category || "General").toLowerCase()));

  async function categoryForProduct(productId: number): Promise<string> {
    if (!productId) return "General";
    if (productCatCache.has(productId)) return productCatCache.get(productId)!;
    let cat = "General";
    try {
      const res = await fetch(`${base}/wp-json/wc/v3/products/${productId}`, { headers: { Authorization: auth } });
      if (res.ok) {
        const prod = (await res.json()) as WooProduct;
        const names = (prod.categories ?? []).map((c) => c.name).filter(Boolean);
        // prefer a category that actually has tiers defined, else the first one
        cat = names.find((n) => tierCatNames.has(n.toLowerCase())) ?? names[0] ?? "General";
      }
    } catch { /* fall back to General */ }
    productCatCache.set(productId, cat);
    return cat;
  }

  let ordersScanned = 0;
  let created = 0;
  let skippedNoCoupon = 0;

  try {
    for (let page = 1; page <= 50; page++) {
      const url = `${base}/wp-json/wc/v3/orders?status=completed&per_page=100&page=${page}`
        + `&modified_after=${encodeURIComponent(since)}&orderby=modified&order=asc`;
      const res = await fetch(url, { headers: { Authorization: auth } });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, message: `WooCommerce API error ${res.status}: ${body.slice(0, 140)}` };
      }
      const orders = (await res.json()) as WooOrder[];
      if (orders.length === 0) break;
      ordersScanned += orders.length;

      const rows: {
        affiliateId: string; orderAmount: number; orderRef: string | null; productName: string | null;
        category: string; externalId: string; soldAt: Date; tierLabel: string; percent: number; commission: number;
      }[] = [];

      for (const order of orders) {
        const couponCode = (order.coupon_lines ?? [])
          .map((c) => c.code?.toUpperCase())
          .find((code) => code && byCoupon.has(code));
        if (!couponCode) { skippedNoCoupon++; continue; }
        const aff = byCoupon.get(couponCode)!;
        const ovMap: Record<string, number> = {};
        aff.overrides.forEach((o) => { ovMap[o.tierId] = o.percent; });
        const soldAt = new Date(order.date_completed_gmt ?? order.date_created_gmt);

        for (const li of order.line_items ?? []) {
          const amount = parseFloat(li.total) || 0;
          if (amount <= 0) continue;
          const category = await categoryForProduct(li.product_id);
          const { tierLabel, percent, commission } = resolveCommission(tiers, amount, ovMap, category);
          rows.push({
            affiliateId: aff.id,
            orderAmount: amount,
            orderRef: order.number,
            productName: li.name,
            category,
            externalId: `woo-${order.id}-${li.id}`,
            soldAt,
            tierLabel, percent, commission,
          });
        }
      }

      if (rows.length) {
        const r = await prisma.affiliateSale.createMany({ data: rows, skipDuplicates: true });
        created += r.count;
      }
      if (orders.length < 100) break;
    }
  } catch (e) {
    return { ok: false, message: `Sync failed: ${(e as Error).message}` };
  }

  await setSetting(K_LAST, runStartedAt);

  return {
    ok: true,
    message: `Synced ${created} new commission line${created === 1 ? "" : "s"} from ${ordersScanned} completed order${ordersScanned === 1 ? "" : "s"}.`,
    ordersScanned, created, skippedNoCoupon,
  };
}
