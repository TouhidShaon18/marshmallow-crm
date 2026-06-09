import "server-only";

const API_KEY = process.env.BULKSMSBD_API_KEY;
const SENDER_ID = process.env.BULKSMSBD_SENDER_ID; // required — your BulkSMSBD sender ID (numeric for non-masking, text for masking)

export type SmsResult = {
  ok: boolean;
  mode: "sent" | "console";
  submitted: number;
  failed: number;
  error?: string;
};

/**
 * Strip non-digits and ensure Bangladesh (88) country prefix.
 * e.g. "01712345678" → "8801712345678"
 */
export function normalizeBDNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("88") ? digits : `88${digits}`;
}

/**
 * Send personalised SMS messages via BulkSMSBD.
 *
 * Recipients with the same message are grouped into a single API call for
 * efficiency. Falls back to console logging when API credentials are not set.
 *
 * BulkSMSBD endpoint: POST https://bulksmsbd.net/api/smsapi
 * Response code 202 = success. All other codes = failure.
 */
export async function sendBulkSMS(
  recipients: { number: string; message: string }[]
): Promise<SmsResult> {
  if (recipients.length === 0) {
    return { ok: true, mode: "sent", submitted: 0, failed: 0 };
  }

  if (!API_KEY || !SENDER_ID) {
    console.log(`\n📱 [SMS console mode — BULKSMSBD_API_KEY or BULKSMSBD_SENDER_ID not set]`);
    for (const r of recipients) {
      console.log(`   To: ${r.number}  →  ${r.message}`);
    }
    return { ok: true, mode: "console", submitted: recipients.length, failed: 0 };
  }

  // Group by message text — same message → one API call (efficient for non-personalised blasts)
  const byMessage = new Map<string, string[]>();
  for (const r of recipients) {
    const arr = byMessage.get(r.message) ?? [];
    arr.push(r.number);
    byMessage.set(r.message, arr);
  }

  let submitted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [message, numbers] of byMessage) {
    try {
      // BulkSMSBD expects form-encoded POST with exactly these 4 fields
      const payload = new URLSearchParams({
        api_key: API_KEY,
        senderid: SENDER_ID,
        number: numbers.join(","),
        message,
      });

      const res = await fetch("https://bulksmsbd.net/api/smsapi", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });

      const data = (await res.json()) as {
        response_code: number;
        success_message?: string;
        error_message?: string;
        total_submitted?: number;
      };

      if (data.response_code === 202) {
        submitted += data.total_submitted ?? numbers.length;
      } else {
        failed += numbers.length;
        errors.push(data.error_message || `BulkSMSBD error code ${data.response_code}`);
      }
    } catch (e) {
      failed += numbers.length;
      errors.push(e instanceof Error ? e.message : "Network error");
    }
  }

  return {
    ok: failed === 0,
    mode: "sent",
    submitted,
    failed,
    error: errors[0],
  };
}
