/**
 * Nuport inbound webhook receiver
 * URL: POST /api/webhooks/nuport
 *
 * Configure this URL in Nuport → Settings → Webhooks (or Integrations).
 * If Nuport asks for a secret token, set NUPORT_WEBHOOK_SECRET in your env.
 *
 * Nuport will POST an order/customer payload when a new customer is added
 * or a new order is placed. We extract the customer data and upsert it.
 */

import { parseNuportPayload } from "@/lib/nuport";
import { getSetting, upsertNuportCustomer } from "@/lib/nuport-sync";

export async function POST(req: Request): Promise<Response> {
  // ── Optional secret verification ────────────────────────────────────────
  const envSecret   = process.env.NUPORT_WEBHOOK_SECRET;
  const storedSecret = await getSetting("nuport_webhook_secret");
  const secret       = envSecret ?? storedSecret;

  if (secret) {
    // Accept secret in header (x-nuport-secret, x-webhook-secret, or Authorization)
    const headerSecret =
      req.headers.get("x-nuport-secret") ??
      req.headers.get("x-webhook-secret") ??
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (headerSecret !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Nuport may send an array (batch) or a single object
  const items: unknown[] = Array.isArray(body) ? body : [body];

  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const customer = parseNuportPayload(item);
    if (!customer) { skipped++; continue; }

    const wasCreated = await upsertNuportCustomer(customer);
    if (wasCreated) created++; else skipped++;
  }

  return Response.json({
    ok: true,
    created,
    skipped,
    receivedAt: new Date().toISOString(),
  });
}

// Allow Vercel to keep this endpoint accessible without CSRF protection
export const dynamic = "force-dynamic";
