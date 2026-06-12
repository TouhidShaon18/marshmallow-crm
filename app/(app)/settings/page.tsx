import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getNuportSettings, getGmbSettings } from "@/app/nuport-actions";
import NuportApiKeyForm from "@/components/nuport-settings-form";
import NuportWebhookSecretForm from "@/components/nuport-webhook-secret-form";
import CopyButton from "@/components/copy-button";
import GmbReviewForm from "@/components/gmb-review-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const [nuport, gmb] = await Promise.all([getNuportSettings(), getGmbSettings()]);

  const headersList = await headers();
  const host  = headersList.get("host") ?? "your-crm.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const webhookUrl = `${proto}://${host}/api/webhooks/nuport`;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Settings</h1>
        <p className="text-sm text-brand-700/70">App configuration and integrations.</p>
      </div>

      {/* GMB Review Automation */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-xl">
            ⭐
          </div>
          <div>
            <h2 className="font-semibold text-brand-900">Google Review SMS</h2>
            <p className="text-sm text-brand-700/70">
              Automatically sends customers an SMS asking for a Google review 3 days after their purchase.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
            gmb.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${gmb.enabled ? "bg-green-500" : "bg-gray-400"}`} />
            {gmb.enabled ? "Active" : "Paused"}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
            gmb.reviewUrl ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${gmb.reviewUrl ? "bg-green-500" : "bg-amber-500"}`} />
            {gmb.reviewUrl ? "Review link configured" : "Review link not set"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
            ⏰ Fires daily at 3 am · targets customers purchased 3 days ago
          </span>
        </div>

        <GmbReviewForm reviewUrl={gmb.reviewUrl} messageTemplate={gmb.messageTemplate} enabled={gmb.enabled} />

        <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-4 text-xs text-brand-700/70 space-y-1.5">
          <p className="font-semibold text-brand-900 text-sm">How it works</p>
          <p>• When you move a customer to the <strong>Purchased</strong> stage, the clock starts.</p>
          <p>• 3 days later the daily cron sends the SMS to their WhatsApp number.</p>
          <p>• Each customer only ever gets one review request (won't repeat).</p>
          <p>• Requires <strong>BULKSMSBD_API_KEY</strong> and <strong>BULKSMSBD_SENDER_ID</strong> to be set in Vercel environment variables.</p>
        </div>
      </div>

      {/* Nuport Integration */}
      <div className="card p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xl">
            📦
          </div>
          <div>
            <h2 className="font-semibold text-brand-900">Nuport Integration</h2>
            <p className="text-sm text-brand-700/70">
              Auto-import customers from Nuport into the CRM whenever a new order is placed.
            </p>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
            nuport.hasKey ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nuport.hasKey ? "bg-green-500" : "bg-amber-500"}`} />
            {nuport.hasKey ? "API key saved" : "API key not set"}
          </span>

          {nuport.webhookSecret && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
              🔒 Webhook secret active
            </span>
          )}

          {nuport.lastWebhookAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
              🕐 Last received:{" "}
              {new Date(nuport.lastWebhookAt).toLocaleString("en-GB", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
            ✅ {nuport.totalSynced} customers synced
          </span>
        </div>

        {/* STEP 1 — Webhook URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">1</span>
            <h3 className="text-sm font-semibold text-brand-900">Add this URL in Nuport</h3>
          </div>
          <p className="ml-7 text-xs text-brand-700/60">
            In Nuport → <strong>Settings → Integrations</strong> (or Webhooks), paste this URL.
            Nuport will POST here every time a new order or customer is added.
          </p>
          <div className="ml-7 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
            <code className="flex-1 break-all font-mono text-xs text-brand-900">{webhookUrl}</code>
            <CopyButton value={webhookUrl} />
          </div>
        </div>

        {/* STEP 2 — Webhook secret */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">2</span>
            <h3 className="text-sm font-semibold text-brand-900">
              Webhook secret{" "}
              <span className="font-normal text-brand-700/50">(optional)</span>
            </h3>
          </div>
          <p className="ml-7 text-xs text-brand-700/60">
            If Nuport asks for a secret token, set it here and paste the same value in Nuport.
            Requests without the matching secret will be rejected.
          </p>
          <div className="ml-7">
            <NuportWebhookSecretForm current={nuport.webhookSecret} />
          </div>
        </div>

        {/* STEP 3 — API key */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-200 text-[10px] font-bold text-brand-700">3</span>
            <h3 className="text-sm font-semibold text-brand-900">
              Nuport API key{" "}
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-normal text-brand-600">optional</span>
            </h3>
          </div>
          <p className="ml-7 text-xs text-brand-700/60">
            Found in Nuport → <strong>Company Settings → API Key</strong>.
            Saves it for future two-way features.
          </p>
          {nuport.maskedKey && (
            <p className="ml-7 text-xs text-brand-700/60">
              Current: <code className="font-mono text-brand-900">{nuport.maskedKey}</code>
            </p>
          )}
          <div className="ml-7">
            <NuportApiKeyForm />
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-4 text-xs text-brand-700/70 space-y-1.5">
          <p className="font-semibold text-brand-900 text-sm">How it works</p>
          <p>• You paste the webhook URL above into Nuport Settings.</p>
          <p>• Whenever a new order is placed in Nuport, it instantly sends the customer data here.</p>
          <p>• The CRM creates a new customer record with their name, phone, and address.</p>
          <p>• Synced customers are tagged <strong>Lead Source: Nuport</strong> and Channel: Online.</p>
          <p>• Duplicate customers (same Nuport ID) are automatically skipped.</p>
        </div>
      </div>
    </div>
  );
}
