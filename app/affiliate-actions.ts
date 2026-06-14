"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole, normaliseRole } from "@/lib/auth";
import { resolveCommission, DEFAULT_TIERS, type TierLike } from "@/lib/affiliate";
import { parseSalesFile } from "@/lib/import";
import { setSetting } from "@/lib/nuport-sync";
import { syncWooCommerce, type WooSyncResult } from "@/lib/woo";

// Marketing + Owner may manage creators & sales.
async function requireMarketing() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isMarketingRole(role)) redirect("/dashboard");
  return user;
}

// Only the owner (admin) sets commission rates.
async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(normaliseRole(user.role))) redirect("/affiliates");
  return user;
}

const s = (fd: FormData, k: string) => fd.get(k)?.toString().trim() || null;
const num = (fd: FormData, k: string) => parseFloat(fd.get(k)?.toString() || "") || 0;

// ── Creators ──────────────────────────────────────────────────────────────────

export async function createAffiliate(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMarketing();
  const name = s(formData, "name");
  const couponCode = s(formData, "couponCode")?.toUpperCase();
  if (!name || !couponCode) return { error: "Name and coupon code are required." };

  const dupe = await prisma.affiliate.findUnique({ where: { couponCode } });
  if (dupe) return { error: `Coupon code "${couponCode}" is already in use.` };

  await prisma.affiliate.create({
    data: {
      name,
      couponCode,
      platform:     s(formData, "platform"),
      socialHandle: s(formData, "socialHandle"),
      phone:        s(formData, "phone"),
      email:        s(formData, "email"),
      notes:        s(formData, "notes"),
    },
  });
  revalidatePath("/affiliates");
  redirect("/affiliates");
}

export async function updateAffiliate(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMarketing();
  const id = s(formData, "id");
  const name = s(formData, "name");
  const couponCode = s(formData, "couponCode")?.toUpperCase();
  if (!id || !name || !couponCode) return { error: "Name and coupon code are required." };

  const dupe = await prisma.affiliate.findFirst({ where: { couponCode, NOT: { id } } });
  if (dupe) return { error: `Coupon code "${couponCode}" is already in use.` };

  await prisma.affiliate.update({
    where: { id },
    data: {
      name, couponCode,
      platform:     s(formData, "platform"),
      socialHandle: s(formData, "socialHandle"),
      phone:        s(formData, "phone"),
      email:        s(formData, "email"),
      notes:        s(formData, "notes"),
      active:       formData.get("active") === "on",
    },
  });
  revalidatePath("/affiliates");
  redirect(`/affiliates/${id}`);
}

export async function deleteAffiliate(id: string): Promise<void> {
  await requireMarketing();
  await prisma.affiliate.delete({ where: { id } });
  revalidatePath("/affiliates");
  redirect("/affiliates");
}

// ── Commission tiers (owner only) ───────────────────────────────────────────

export async function seedDefaultTiers(): Promise<void> {
  await requireOwner();
  const count = await prisma.commissionTier.count();
  if (count === 0) {
    await prisma.commissionTier.createMany({
      data: DEFAULT_TIERS.map((t, i) => ({ ...t, sort: i })),
    });
  }
  revalidatePath("/affiliates/tiers");
}

export async function saveTiers(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireOwner();
  const cats = formData.getAll("tierCategory").map((v) => v.toString().trim());
  const labels = formData.getAll("tierLabel").map((v) => v.toString().trim());
  const mins = formData.getAll("tierMin").map((v) => parseFloat(v.toString()) || 0);
  const maxes = formData.getAll("tierMax").map((v) => v.toString().trim());
  const pcts = formData.getAll("tierPercent").map((v) => parseFloat(v.toString()) || 0);
  const ids = formData.getAll("tierId").map((v) => v.toString());

  const rows = labels
    .map((label, i) => ({
      id: ids[i] || null,
      category: cats[i] || "General",
      label,
      minAmount: mins[i] ?? 0,
      maxAmount: maxes[i] === "" ? null : parseFloat(maxes[i]) || null,
      percent: pcts[i] ?? 0,
      sort: i,
    }))
    .filter((r) => r.label !== "");

  // Replace the whole set: delete removed rows, upsert the rest.
  const keepIds = rows.map((r) => r.id).filter(Boolean) as string[];
  await prisma.commissionTier.deleteMany({ where: { id: { notIn: keepIds.length ? keepIds : ["__none__"] } } });
  for (const r of rows) {
    if (r.id) {
      await prisma.commissionTier.update({
        where: { id: r.id },
        data: { category: r.category, label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount, percent: r.percent, sort: r.sort },
      });
    } else {
      await prisma.commissionTier.create({
        data: { category: r.category, label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount, percent: r.percent, sort: r.sort },
      });
    }
  }
  revalidatePath("/affiliates/tiers");
  revalidatePath("/affiliates");
  redirect("/affiliates");
}

// ── Per-creator overrides (owner only) ───────────────────────────────────────

export async function saveOverrides(affiliateId: string, formData: FormData): Promise<void> {
  await requireOwner();
  const tierIds = formData.getAll("overrideTierId").map((v) => v.toString());
  const values = formData.getAll("overrideValue").map((v) => v.toString().trim());

  await prisma.affiliateCommissionOverride.deleteMany({ where: { affiliateId } });
  const toCreate = tierIds
    .map((tierId, i) => ({ tierId, value: values[i] }))
    .filter((o) => o.value !== "" && !isNaN(parseFloat(o.value)))
    .map((o) => ({ affiliateId, tierId: o.tierId, percent: parseFloat(o.value) }));
  if (toCreate.length) await prisma.affiliateCommissionOverride.createMany({ data: toCreate });

  revalidatePath(`/affiliates/${affiliateId}`);
}

// ── Commission calculation (server) ──────────────────────────────────────────

async function computeFor(affiliateId: string, amount: number, category: string) {
  const [tiers, overrides] = await Promise.all([
    prisma.commissionTier.findMany({ orderBy: { minAmount: "asc" } }),
    prisma.affiliateCommissionOverride.findMany({ where: { affiliateId } }),
  ]);
  const ovMap: Record<string, number> = {};
  overrides.forEach((o) => { ovMap[o.tierId] = o.percent; });
  return resolveCommission(tiers as TierLike[], amount, ovMap, category);
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function recordSale(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMarketing();
  const affiliateId = s(formData, "affiliateId");
  const orderAmount = num(formData, "orderAmount");
  if (!affiliateId) return { error: "Pick a creator." };
  if (orderAmount <= 0) return { error: "Enter a valid order amount." };

  const tierCount = await prisma.commissionTier.count();
  if (tierCount === 0) return { error: "Set up commission tiers first (Commission tiers page)." };

  const category = s(formData, "category") || "General";
  const { tierLabel, percent, commission } = await computeFor(affiliateId, orderAmount, category);
  const soldAtStr = s(formData, "soldAt");

  await prisma.affiliateSale.create({
    data: {
      affiliateId,
      orderAmount,
      orderRef:    s(formData, "orderRef"),
      productName: s(formData, "productName"),
      category,
      soldAt:      soldAtStr ? new Date(soldAtStr) : new Date(),
      tierLabel, percent, commission,
    },
  });
  revalidatePath("/affiliates");
  revalidatePath(`/affiliates/${affiliateId}`);
  redirect(`/affiliates/${affiliateId}`);
}

export async function deleteSale(saleId: string, affiliateId: string): Promise<void> {
  await requireMarketing();
  await prisma.affiliateSale.delete({ where: { id: saleId } });
  revalidatePath(`/affiliates/${affiliateId}`);
  revalidatePath("/affiliates");
}

export type ImportSalesState = {
  ok?: boolean;
  created?: number;
  skipped?: number;
  unmatched?: string[];
  errors?: string[];
  message?: string;
};

export async function importSales(
  _prev: ImportSalesState | undefined,
  formData: FormData,
): Promise<ImportSalesState> {
  await requireMarketing();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Please choose a file to upload." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "File is too large (max 5 MB)." };

  const tiers = await prisma.commissionTier.findMany({ orderBy: { minAmount: "asc" } });
  if (tiers.length === 0) return { ok: false, message: "Set up commission tiers first." };

  let parsed;
  try {
    parsed = parseSalesFile(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, message: "Could not read that file. Upload a .xlsx, .xls or .csv." };
  }
  if (parsed.sales.length === 0) return { ok: false, errors: parsed.errors, message: "No sales could be imported." };

  // Map coupon → affiliate (case-insensitive) and preload overrides.
  const affiliates = await prisma.affiliate.findMany({ include: { overrides: true } });
  const byCoupon = new Map(affiliates.map((a) => [a.couponCode.toUpperCase(), a]));

  const unmatched = new Set<string>();
  const errors = [...parsed.errors];
  const data: {
    affiliateId: string; orderAmount: number; orderRef: string | null; productName: string | null;
    category: string; soldAt: Date; tierLabel: string; percent: number; commission: number;
  }[] = [];

  for (const row of parsed.sales) {
    const aff = byCoupon.get(row.couponCode.toUpperCase());
    if (!aff) { unmatched.add(row.couponCode); continue; }
    const ovMap: Record<string, number> = {};
    aff.overrides.forEach((o) => { ovMap[o.tierId] = o.percent; });
    const category = row.category || "General";
    const { tierLabel, percent, commission } = resolveCommission(tiers as TierLike[], row.orderAmount, ovMap, category);
    data.push({
      affiliateId: aff.id,
      orderAmount: row.orderAmount,
      orderRef: row.orderRef,
      productName: row.productName,
      category,
      soldAt: row.soldAt ?? new Date(),
      tierLabel, percent, commission,
    });
  }

  if (data.length) await prisma.affiliateSale.createMany({ data });

  revalidatePath("/affiliates");

  return {
    ok: true,
    created: data.length,
    skipped: parsed.errors.length + unmatched.size,
    unmatched: [...unmatched],
    errors,
    message: `Imported ${data.length} sale${data.length === 1 ? "" : "s"}.`,
  };
}

// ── Payouts ─────────────────────────────────────────────────────────────────

// ── WooCommerce auto-sync (owner) ────────────────────────────────────────────

export async function saveWooSettings(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOwner();
  const rawUrl = s(formData, "storeUrl");
  const enabled = formData.get("enabled") === "true";

  if (rawUrl && !/^https?:\/\//i.test(rawUrl)) return { error: "Store URL must start with https://" };
  if (rawUrl) await setSetting("woo_store_url", rawUrl.replace(/\/+$/, ""));

  // Only overwrite key/secret if new values were entered (blank = keep existing).
  const key = s(formData, "consumerKey");
  const secret = s(formData, "consumerSecret");
  if (key) await setSetting("woo_consumer_key", key);
  if (secret) await setSetting("woo_consumer_secret", secret);

  await setSetting("woo_sync_enabled", enabled ? "true" : "false");
  revalidatePath("/settings");
  return { ok: true };
}

export async function syncWooNow(
  _prev: WooSyncResult | undefined,
): Promise<WooSyncResult> {
  await requireOwner();
  const result = await syncWooCommerce();
  revalidatePath("/affiliates");
  revalidatePath("/settings");
  return result;
}

export async function recordPayout(affiliateId: string, formData: FormData): Promise<void> {
  await requireMarketing();

  // Settle all currently-unpaid commissions for this creator.
  const unpaid = await prisma.affiliateSale.findMany({
    where: { affiliateId, paid: false },
    select: { id: true, commission: true },
  });
  if (unpaid.length === 0) { revalidatePath(`/affiliates/${affiliateId}`); return; }

  const amount = unpaid.reduce((t, s2) => t + s2.commission, 0);
  const now = new Date();

  const payout = await prisma.affiliatePayout.create({
    data: {
      affiliateId,
      amount,
      method:    s(formData, "method"),
      reference: s(formData, "reference"),
      note:      s(formData, "note"),
      paidAt:    now,
    },
  });
  await prisma.affiliateSale.updateMany({
    where: { id: { in: unpaid.map((u) => u.id) } },
    data: { paid: true, paidAt: now, payoutId: payout.id },
  });

  revalidatePath(`/affiliates/${affiliateId}`);
  revalidatePath("/affiliates");
}
