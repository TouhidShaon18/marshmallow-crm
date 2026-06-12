"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isFinanceRole, normaliseRole } from "@/lib/auth";

async function requireFinance() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isFinanceRole(role)) redirect("/dashboard");
  return user;
}

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(normaliseRole(user.role))) redirect("/finance");
  return user;
}

const f = (fd: FormData, k: string) => parseFloat(fd.get(k)?.toString() || "0") || 0;

// ── Finance Entry (P&L) ───────────────────────────────────────────────────────

export async function upsertFinanceEntry(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireFinance();
  const period = formData.get("period")?.toString();
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return { error: "Invalid period." };

  const data = {
    revenue:           f(formData, "revenue"),
    cogsRawMaterials:  f(formData, "cogsRawMaterials"),
    cogsLabour:        f(formData, "cogsLabour"),
    cogsPackaging:     f(formData, "cogsPackaging"),
    cogsDirectProd:    f(formData, "cogsDirectProd"),
    cogsMisc:          f(formData, "cogsMisc"),
    opexRent:          f(formData, "opexRent"),
    opexSalaries:      f(formData, "opexSalaries"),
    opexSubscriptions: f(formData, "opexSubscriptions"),
    opexUtilities:     f(formData, "opexUtilities"),
    opexMarketing:     f(formData, "opexMarketing"),
    opexLogistics:     f(formData, "opexLogistics"),
    opexMiscVar:       f(formData, "opexMiscVar"),
    taxAndInterest:    f(formData, "taxAndInterest"),
    notes:             formData.get("notes")?.toString().trim() || null,
    updatedAt:         new Date(),
  };

  await prisma.financeEntry.upsert({
    where:  { period },
    create: { period, ...data },
    update: data,
  });

  revalidatePath("/finance");
  return {};
}

// ── Finance Goals ─────────────────────────────────────────────────────────────

export async function upsertFinanceGoal(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireOwner();
  const period = formData.get("period")?.toString();
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return { error: "Invalid period." };

  const opt = (k: string) => { const v = formData.get(k)?.toString(); return v ? parseFloat(v) : null; };

  const data = {
    revenueTarget:     opt("revenueTarget"),
    netProfitTarget:   opt("netProfitTarget"),
    grossMarginTarget: opt("grossMarginTarget"),
    opexBudget:        opt("opexBudget"),
    marketingBudget:   opt("marketingBudget"),
    notes:             formData.get("notes")?.toString().trim() || null,
    updatedAt:         new Date(),
  };

  await prisma.financeGoal.upsert({
    where:  { period },
    create: { period, ...data },
    update: data,
  });

  revalidatePath("/finance");
  return {};
}

// ── Computed helpers (exported for pages) ────────────────────────────────────

export type FinanceCalc = {
  period: string;
  revenue: number;
  cogsTotal: number;
  grossProfit: number;
  grossMarginPct: number;
  opexFixed: number;
  opexVariable: number;
  opexTotal: number;
  ebit: number;
  netProfit: number;
  netMarginPct: number;
  breakEven: number | null;
};

export function calcFinance(e: {
  period: string; revenue: number;
  cogsRawMaterials: number; cogsLabour: number; cogsPackaging: number;
  cogsDirectProd: number; cogsMisc: number;
  opexRent: number; opexSalaries: number; opexSubscriptions: number;
  opexUtilities: number; opexMarketing: number; opexLogistics: number;
  opexMiscVar: number; taxAndInterest: number;
}): FinanceCalc {
  const cogsTotal      = e.cogsRawMaterials + e.cogsLabour + e.cogsPackaging + e.cogsDirectProd + e.cogsMisc;
  const grossProfit    = e.revenue - cogsTotal;
  const grossMarginPct = e.revenue > 0 ? (grossProfit / e.revenue) * 100 : 0;
  const opexFixed      = e.opexRent + e.opexSalaries + e.opexSubscriptions;
  const opexVariable   = e.opexUtilities + e.opexMarketing + e.opexLogistics + e.opexMiscVar;
  const opexTotal      = opexFixed + opexVariable;
  const ebit           = grossProfit - opexTotal;
  const netProfit      = ebit - e.taxAndInterest;
  const netMarginPct   = e.revenue > 0 ? (netProfit / e.revenue) * 100 : 0;
  const breakEven      = grossMarginPct > 0 ? (opexFixed / (grossMarginPct / 100)) : null;

  return { period: e.period, revenue: e.revenue, cogsTotal, grossProfit, grossMarginPct, opexFixed, opexVariable, opexTotal, ebit, netProfit, netMarginPct, breakEven };
}
