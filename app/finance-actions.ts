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

