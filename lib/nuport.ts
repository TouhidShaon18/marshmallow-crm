/**
 * Nuport API utilities
 *
 * Base URL:  https://api.nuport.io
 * Auth:      Authorization: <api_key>   (raw key, no "Bearer" prefix)
 *
 * Note: Nuport's published API is write-only for customers
 * (POST /integration/customers pushes TO Nuport). There is no GET customers
 * endpoint. The integration uses an inbound webhook instead — Nuport calls
 * our /api/webhooks/nuport endpoint when new orders/customers are added.
 */

const BASE_URL = "https://api.nuport.io";

/**
 * Normalised customer data we extract from any Nuport webhook payload.
 * Nuport may send an order object, a customer object, or a combined one.
 */
export type NuportCustomer = {
  nuportId: string;        // whatever unique ID Nuport provides
  name:     string;
  mobile?:  string;
  phone?:   string;
  email?:   string;
  address?: string;
  area?:    string;
  source?:  string;        // order source e.g. FACEBOOK, WHATSAPP
};

/**
 * Parse a Nuport webhook payload (order or customer) into our normalised shape.
 * Handles the various shapes Nuport may send.
 */
export function parseNuportPayload(body: unknown): NuportCustomer | null {
  if (!body || typeof body !== "object") return null;
  const d = body as Record<string, unknown>;

  // Try to extract customer/recipient block (order payloads often nest customer info)
  const customer = (d.customer ?? d.recipient ?? d.consignee ?? d) as Record<string, unknown>;

  const id    = String(customer.id ?? d.customerId ?? d.id ?? "");
  const name  = String(customer.name ?? d.customerName ?? d.name ?? "").trim();

  if (!id || !name) return null;

  return {
    nuportId: id,
    name,
    mobile:  toStr(customer.mobile  ?? d.mobile  ?? customer.phone ?? d.phone),
    email:   toStr(customer.email   ?? d.email),
    address: toStr(customer.address ?? d.address ?? customer.deliveryAddress ?? d.deliveryAddress),
    area:    toStr(customer.area    ?? d.area    ?? customer.zone ?? d.zone),
    source:  toStr(d.source ?? d.orderSource ?? d.channel),
  };
}

function toStr(v: unknown): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

/** Validate the API key by hitting a known lightweight endpoint. */
export async function testNuportApiKey(apiKey: string): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_URL}/integration/order-sources`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}
