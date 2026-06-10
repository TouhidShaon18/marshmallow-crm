import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNuportSettings } from "@/app/nuport-actions";
import NuportSettingsForm from "@/components/nuport-settings-form";
import NuportSyncButton from "@/components/nuport-sync-button";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const nuport = await getNuportSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Settings</h1>
        <p className="text-sm text-brand-700/70">App configuration and integrations.</p>
      </div>

      {/* Nuport Integration */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xl">
            📦
          </div>
          <div>
            <h2 className="font-semibold text-brand-900">Nuport Integration</h2>
            <p className="text-sm text-brand-700/70">
              Auto-import customers from your Nuport order management account into the CRM.
              Sync runs every hour — new Nuport customers appear here automatically.
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
            nuport.hasKey ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nuport.hasKey ? "bg-green-500" : "bg-amber-500"}`} />
            {nuport.hasKey ? "Connected" : "Not configured"}
          </span>

          {nuport.lastSyncAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
              🕐 Last sync:{" "}
              {new Date(nuport.lastSyncAt).toLocaleString("en-GB", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          )}

          {nuport.lastSyncCount !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
              ✅ {nuport.lastSyncCount} customers added last sync
            </span>
          )}
        </div>

        {/* Current masked key */}
        {nuport.maskedKey && (
          <div className="rounded-lg bg-brand-50 px-4 py-2.5 text-sm">
            <span className="text-brand-700/60">Current API key: </span>
            <code className="font-mono text-brand-900">{nuport.maskedKey}</code>
          </div>
        )}

        {/* API key form */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-900">
            {nuport.hasKey ? "Update API key" : "Enter your Nuport API key"}
          </h3>
          <p className="mb-3 text-xs text-brand-700/60">
            Find it in Nuport → <strong>Company Settings</strong> → <strong>API Key</strong>.
          </p>
          <NuportSettingsForm />
        </div>

        {/* Manual sync */}
        {nuport.hasKey && (
          <div className="border-t border-brand-100 pt-4">
            <h3 className="mb-1 text-sm font-semibold text-brand-900">Manual sync</h3>
            <p className="mb-3 text-xs text-brand-700/60">
              Pull the latest customers from Nuport right now without waiting for the hourly job.
            </p>
            <NuportSyncButton />
          </div>
        )}

        {/* How it works */}
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-4 text-xs text-brand-700/70 space-y-1.5">
          <p className="font-semibold text-brand-900 text-sm">How the sync works</p>
          <p>• Every hour the CRM fetches your full customer list from Nuport.</p>
          <p>• Only <strong>new</strong> customers are added — existing CRM records are never overwritten.</p>
          <p>• Synced customers are tagged with <strong>lead source: Nuport</strong> and channel: Online.</p>
          <p>• They land with no sales rep — assign them from the Customers page.</p>
          <p>• If a customer was already added manually with the same Nuport ID, it's skipped.</p>
        </div>
      </div>
    </div>
  );
}
