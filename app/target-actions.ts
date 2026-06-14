"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole } from "@/lib/auth";

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(user.role)) redirect("/dashboard");
  return user;
}

export async function setEmployeeTarget(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireOwner();

  const userId = formData.get("userId")?.toString();
  const period = formData.get("period")?.toString();
  if (!userId || !period) return { error: "Missing data." };

  const n = (key: string) => parseFloat(formData.get(key)?.toString() ?? "") || null;
  const i = (key: string) => parseInt(formData.get(key)?.toString() ?? "") || null;

  const data = {
    // Sales targets
    revenueTarget:       n("revenueTarget"),
    contactTarget:       i("contactTarget"),
    followup7dTarget:    i("followup7dTarget"),
    followup30dTarget:   i("followup30dTarget"),
    convertedSaleTarget: i("convertedSaleTarget"),
    repeatSaleTarget:    i("repeatSaleTarget"),
    newCustomerTarget:   i("newCustomerTarget"),
    // Marketing targets
    postsTarget:         i("postsTarget"),
    viewsTarget:         i("viewsTarget"),
    reactsTarget:        i("reactsTarget"),
    commentsTarget:      i("commentsTarget"),
    sharesTarget:        i("sharesTarget"),
  };

  await prisma.employeeTarget.upsert({
    where: { userId_period: { userId, period } },
    create: { userId, period, ...data },
    update: data,
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/marketing");
  return {};
}

// ── Sales progress ────────────────────────────────────────────────────────────

export async function getTargetProgress(userId: string, period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month,     1);

  const [interactions, newCustomers, revenueResult] = await Promise.all([
    prisma.interaction.findMany({
      where: { employeeId: userId, createdAt: { gte: start, lt: end } },
      select: {
        customerId: true,
        createdAt:  true,
        customer: {
          select: { createdAt: true, orderAmount: true, repeatCustomer: true },
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
    if ((it.customer.orderAmount ?? 0) > 0) convertedSaleSet.add(it.customerId);
    if (it.customer.repeatCustomer)         repeatSaleSet.add(it.customerId);
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

// ── Marketing progress ────────────────────────────────────────────────────────

export async function getMarketingProgress(userId: string, period: string) {
  const posts = await prisma.socialPost.findMany({
    where: {
      assignedToId: userId,
      period,
      status: { in: ["POSTED", "METRICS_LOGGED"] },
    },
    select: {
      channel:      true,
      viewCount:    true,
      reactCount:   true,
      commentCount: true,
      shareCount:   true,
      status:       true,
    },
  });

  // Channel breakdown
  const channelCounts: Record<string, number> = {};
  for (const p of posts) {
    channelCounts[p.channel] = (channelCounts[p.channel] ?? 0) + 1;
  }

  return {
    posts:    posts.length,
    views:    posts.reduce((s, p) => s + (p.viewCount    ?? 0), 0),
    reacts:   posts.reduce((s, p) => s + (p.reactCount   ?? 0), 0),
    comments: posts.reduce((s, p) => s + (p.commentCount ?? 0), 0),
    shares:   posts.reduce((s, p) => s + (p.shareCount   ?? 0), 0),
    channelCounts,
  };
}
