"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdminRole } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/nuport-sync";
import { testNuportApiKey } from "@/lib/nuport";

// Integrations & API keys are Super-Admin-only.
async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isSuperAdminRole(user.role)) redirect("/dashboard");
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

// ── GMB Review settings ───────────────────────────────────────────────────────

export async function getGmbSettings() {
  const reviewUrl       = await getSetting("gmb_review_url");
  const messageTemplate = await getSetting("gmb_review_message");
  const enabledRaw      = await getSetting("gmb_review_enabled");
  const enabled         = enabledRaw === "true";
  return { reviewUrl, messageTemplate, enabled };
}

export async function saveGmbSettings(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireOwner();
  const url     = formData.get("reviewUrl")?.toString().trim() ?? "";
  const msg     = formData.get("messageTemplate")?.toString().trim() ?? "";
  const enabled = formData.get("enabled") === "true";
  await setSetting("gmb_review_enabled", enabled ? "true" : "false");
  if (url) await setSetting("gmb_review_url", url);
  await setSetting("gmb_review_message", msg || "Hi {name}, thank you for your purchase! We'd love your feedback — please leave us a quick Google review: {url} 🙏");
  revalidatePath("/settings");
  return {};
}
