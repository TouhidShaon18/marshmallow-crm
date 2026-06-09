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

  const n = (key: string) => parseFloat(formData.get(key)?.toString() ?? "") || null;
  const i = (key: string) => parseInt(formData.get(key)?.toString() ?? "") || null;

  const data = {
    revenueTarget:       n("revenueTarget"),
    contactTarget:       i("contactTarget"),
    followup7dTarget:    i("followup7dTarget"),
    followup30dTarget:   i("followup30dTarget"),
    convertedSaleTarget: i("convertedSaleTarget"),
    repeatSaleTarget:    i("repeatSaleTarget"),
    newCustomerTarget:   i("newCustomerTarget"),
  };

  await prisma.employeeTarget.upsert({
    where: { userId_period: { userId, period } },
    create: { userId, period, ...data },
    update: data,
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return {};
}

/** Calculate actual progress for a user in a given period (YYYY-MM). */
export async function getTargetProgress(userId: string, period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month,     1);

  // Fetch all interactions in the period with lightweight customer data
  const [interactions, newCustomers, revenueResult] = await Promise.all([
    prisma.interaction.findMany({
      where: { employeeId: userId, createdAt: { gte: start, lt: end } },
      select: {
        customerId: true,
        createdAt:  true,
        customer: {
          select: {
            createdAt:      true,
            orderAmount:    true,
            repeatCustomer: true,
          },
        },
      },
    }),
    prisma.customer.count({
      where: { assignedToId: userId, createdAt: { gte: start, lt: end } },
    }),
    prisma.customer.aggregate({
      where: { assignedToId: userId, createdAt: { gte: start, lt: end } },
      _sum: { orderAmount: true },
    }),
  ]);

  // Derive secondary metrics from interaction list (one DB round-trip)
  const MS_7  = 7  * 86_400_000;
  const MS_30 = 30 * 86_400_000;

  const followup7dSet    = new Set<string>();
  const followup30dSet   = new Set<string>();
  const convertedSaleSet = new Set<string>();
  const repeatSaleSet    = new Set<string>();

  for (const it of interactions) {
    const gap = it.createdAt.getTime() - it.customer.createdAt.getTime();
    if (gap <= MS_7)  followup7dSet.add(it.customerId);
    if (gap <= MS_30) followup30dSet.add(it.customerId);
    if ((it.customer.orderAmount ?? 0) > 0)  convertedSaleSet.add(it.customerId);
    if (it.customer.repeatCustomer)           repeatSaleSet.add(it.customerId);
  }

  return {
    contacts:      interactions.length,
    followup7d:    followup7dSet.size,
    followup30d:   followup30dSet.size,
    convertedSales: convertedSaleSet.size,
    repeatSales:   repeatSaleSet.size,
    newCustomers,
    revenue:       revenueResult._sum.orderAmount ?? 0,
  };
}
