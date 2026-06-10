"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/nuport-sync";
import { testNuportApiKey } from "@/lib/nuport";

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");
  return user;
}

/** Save (and live-validate) the Nuport API key. */
export async function saveNuportApiKey(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOwner();

  const key = formData.get("apiKey")?.toString().trim();
  if (!key) return { error: "API key cannot be empty." };

  const valid = await testNuportApiKey(key);
  if (!valid) return { error: "Could not connect to Nuport with that key. Double-check and try again." };

  await setSetting("nuport_api_key", key);
  revalidatePath("/settings");
  return { ok: true };
}

/** Save a webhook secret the user wants to use for verification. */
export async function saveWebhookSecret(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOwner();

  const secret = formData.get("webhookSecret")?.toString().trim() ?? "";
  await setSetting("nuport_webhook_secret", secret);
  revalidatePath("/settings");
  return { ok: true };
}

/** Read current settings for the settings page. */
export async function getNuportSettings() {
  const rawKey        = await getSetting("nuport_api_key");
  const webhookSecret = await getSetting("nuport_webhook_secret");
  const lastWebhook   = await getSetting("nuport_last_webhook_at");
  const totalSynced   = await getSetting("nuport_total_synced");

  return {
    hasKey:       !!rawKey,
    maskedKey:    rawKey
      ? `${rawKey.slice(0, 6)}${"•".repeat(Math.max(0, rawKey.length - 10))}${rawKey.slice(-4)}`
      : null,
    webhookSecret: webhookSecret ?? "",
    lastWebhookAt: lastWebhook,
    totalSynced:   totalSynced ? parseInt(totalSynced) : 0,
  };
}
