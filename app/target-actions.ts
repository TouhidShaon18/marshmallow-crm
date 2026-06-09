"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");
  return user;
}

export async function setEmployeeTarget(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireOwner();

  const userId = formData.get("userId")?.toString();
  const period = formData.get("period")?.toString(); // "YYYY-MM"
  if (!userId || !period) return { error: "Missing data." };

  const revenueTarget = parseFloat(formData.get("revenueTarget")?.toString() ?? "") || null;
  const contactTarget = parseInt(formData.get("contactTarget")?.toString() ?? "") || null;
  const newCustomerTarget = parseInt(formData.get("newCustomerTarget")?.toString() ?? "") || null;

  await prisma.employeeTarget.upsert({
    where: { userId_period: { userId, period } },
    create: { userId, period, revenueTarget, contactTarget, newCustomerTarget },
    update: { revenueTarget, contactTarget, newCustomerTarget },
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return {};
}

/** Calculate actual progress for a user in a given period (YYYY-MM). */
export async function getTargetProgress(userId: string, period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [contacts, newCustomers, revenueResult] = await Promise.all([
    prisma.interaction.count({
      where: { employeeId: userId, createdAt: { gte: start, lt: end } },
    }),
    prisma.customer.count({
      where: { assignedToId: userId, createdAt: { gte: start, lt: end } },
    }),
    prisma.customer.aggregate({
      where: { assignedToId: userId, createdAt: { gte: start, lt: end } },
      _sum: { orderAmount: true },
    }),
  ]);

  return {
    contacts,
    newCustomers,
    revenue: revenueResult._sum.orderAmount ?? 0,
  };
}
