"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isFinanceRole, normaliseRole } from "@/lib/auth";
import { isValidPeriod, type FinancePeriodType } from "@/lib/finance";

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

// Zip parallel label[]/amount[] form fields into line items, dropping blanks.
function readLineItems(fd: FormData, prefix: string) {
  const labels = fd.getAll(`${prefix}Label`).map((v) => v.toString().trim());
  const amounts = fd.getAll(`${prefix}Amount`).map((v) => parseFloat(v.toString()) || 0);
  const items = labels
    .map((label, i) => ({ label, amount: amounts[i] ?? 0 }))
    .filter((it) => it.label !== "" || it.amount !== 0);
  const total = items.reduce((t, it) => t + it.amount, 0);
  return { items, total };
}

// ── Finance Entry (P&L) ───────────────────────────────────────────────────────

export async function upsertFinanceEntry(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireFinance();
  const periodType = (formData.get("periodType")?.toString() || "MONTHLY") as FinancePeriodType;
  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(periodType)) return { error: "Invalid period type." };
  const period = formData.get("period")?.toString();
  if (!period || !isValidPeriod(periodType, period)) return { error: "Invalid period." };

  const marketing = readLineItems(formData, "marketing");
  const utilities = readLineItems(formData, "utility");

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
    opexUtilities:      utilities.total,
    opexUtilitiesItems: utilities.items,
    opexMarketing:      marketing.total,
    opexMarketingItems: marketing.items,
    opexLogistics:     f(formData, "opexLogistics"),
    opexMiscVar:       f(formData, "opexMiscVar"),
    taxAndInterest:    f(formData, "taxAndInterest"),
    notes:             formData.get("notes")?.toString().trim() || null,
    updatedAt:         new Date(),
  };

  await prisma.financeEntry.upsert({
    where:  { periodType_period: { periodType, period } },
    create: { periodType, period, ...data },
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

