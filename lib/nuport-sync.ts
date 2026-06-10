/**
 * Core Nuport → CRM sync logic.
 *
 * The Nuport API doesn't expose a GET customers endpoint, so we use an
 * inbound webhook instead. This module handles:
 *  - upsertNuportCustomer()  — called by the webhook receiver per event
 *  - getSetting / setSetting — shared key-value helpers
 */

import { prisma } from "@/lib/db";
import type { NuportCustomer } from "@/lib/nuport";

export type SyncResult = {
  created: number;
  skipped: number;
  total:   number;
  error?:  string;
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
 * Insert a single Nuport customer into the CRM (if not already present).
 * Called by the webhook receiver for each inbound event.
 * Returns true if a new record was created, false if it already existed.
 */
export async function upsertNuportCustomer(c: NuportCustomer): Promise<boolean> {
  const existing = await prisma.customer.findUnique({
    where:  { nuportId: c.nuportId },
    select: { id: true },
  });

  if (existing) return false; // already in CRM — skip to avoid overwriting edits

  await prisma.customer.create({
    data: {
      nuportId:      c.nuportId,
      name:          c.name,
      whatsappNumber: c.mobile ?? c.phone ?? null,
      email:         c.email  ?? null,
      address:       c.address ?? null,
      channel:       "ONLINE",
      leadSource:    c.source ? `Nuport (${c.source})` : "Nuport",
    },
  });

  // Bump sync counter
  const prev = parseInt((await getSetting("nuport_total_synced")) ?? "0");
  await setSetting("nuport_total_synced", String(prev + 1));
  await setSetting("nuport_last_webhook_at", new Date().toISOString());

  return true;
}

/** Dummy runNuportSync kept so the cron route still compiles (no-op now). */
export async function runNuportSync(): Promise<SyncResult> {
  return { created: 0, skipped: 0, total: 0, error: "Polling not supported — using webhooks." };
}
