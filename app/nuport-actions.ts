"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, setSetting, runNuportSync } from "@/lib/nuport-sync";
import { testNuportApiKey } from "@/lib/nuport";

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");
  return user;
}

/** Save (or update) the Nuport API key. Validates it live before saving. */
export async function saveNuportApiKey(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOwner();

  const key = formData.get("apiKey")?.toString().trim();
  if (!key) return { error: "API key cannot be empty." };

  const valid = await testNuportApiKey(key);
  if (!valid) return { error: "Could not connect to Nuport with that API key. Check the key and try again." };

  await setSetting("nuport_api_key", key);
  revalidatePath("/settings");
  return { ok: true };
}

/** Manually trigger a Nuport sync and return the result. */
export async function triggerNuportSync(
  _prev: { error?: string; created?: number; total?: number } | undefined,
): Promise<{ error?: string; created?: number; total?: number }> {
  await requireOwner();

  const result = await runNuportSync();
  revalidatePath("/customers");
  revalidatePath("/settings");

  if (result.error) return { error: result.error };
  return { created: result.created, total: result.total };
}

/** Read current settings for the settings page (API key masked, last sync time). */
export async function getNuportSettings() {
  const rawKey     = await getSetting("nuport_api_key");
  const lastSync   = await getSetting("nuport_last_sync_at");
  const lastCount  = await getSetting("nuport_last_sync_count");

  return {
    hasKey:      !!rawKey,
    maskedKey:   rawKey ? `${rawKey.slice(0, 6)}${"•".repeat(Math.max(0, rawKey.length - 10))}${rawKey.slice(-4)}` : null,
    lastSyncAt:  lastSync,
    lastSyncCount: lastCount ? parseInt(lastCount) : null,
  };
}
