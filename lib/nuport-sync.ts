/**
 * Core Nuport → CRM sync logic.
 * Called by both the cron endpoint and the manual "Sync now" button.
 */

import { prisma } from "@/lib/db";
import { fetchAllNuportCustomers } from "@/lib/nuport";

export type SyncResult = {
  created:   number;
  skipped:   number;
  total:     number;
  error?:    string;
};

/** Read a Setting by key; returns null if not set. */
export async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value ?? null;
}

/** Write (upsert) a Setting. */
export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where:  { key },
    create: { key, value },
    update: { value },
  });
}

/**
 * Pull all customers from Nuport and insert net-new ones into the CRM.
 * Existing records (matched by nuportId) are never overwritten so manual
 * CRM edits are preserved.
 */
export async function runNuportSync(): Promise<SyncResult> {
  const apiKey = await getSetting("nuport_api_key");
  if (!apiKey) {
    return { created: 0, skipped: 0, total: 0, error: "No Nuport API key configured." };
  }

  let nuportCustomers;
  try {
    nuportCustomers = await fetchAllNuportCustomers(apiKey);
  } catch (e) {
    return {
      created: 0, skipped: 0, total: 0,
      error: e instanceof Error ? e.message : "Failed to fetch from Nuport.",
    };
  }

  if (nuportCustomers.length === 0) {
    await setSetting("nuport_last_sync_at", new Date().toISOString());
    await setSetting("nuport_last_sync_count", "0");
    return { created: 0, skipped: 0, total: 0 };
  }

  // Find which nuportIds already exist in the CRM
  const nuportIds = nuportCustomers.map((c) => String(c.id));
  const existing = await prisma.customer.findMany({
    where: { nuportId: { in: nuportIds } },
    select: { nuportId: true },
  });
  const existingSet = new Set(existing.map((c) => c.nuportId));

  const toCreate = nuportCustomers.filter((c) => !existingSet.has(String(c.id)));

  let created = 0;
  if (toCreate.length > 0) {
    const result = await prisma.customer.createMany({
      data: toCreate.map((c) => ({
        nuportId:       String(c.id),
        name:           c.name?.trim() || "Unknown",
        whatsappNumber: (c.mobile ?? c.phone ?? "").toString().trim() || null,
        email:          c.email?.toString().trim() || null,
        address:        c.address?.toString().trim() || null,
        channel:        "ONLINE" as const,
        leadSource:     "Nuport",
      })),
      skipDuplicates: true,
    });
    created = result.count;
  }

  const now = new Date().toISOString();
  await setSetting("nuport_last_sync_at", now);
  await setSetting("nuport_last_sync_count", String(created));

  return {
    created,
    skipped: nuportCustomers.length - toCreate.length,
    total:   nuportCustomers.length,
  };
}
