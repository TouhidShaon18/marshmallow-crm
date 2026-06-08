import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Marshmallow CRM <onboarding@resend.dev>";

type SendArgs = { to: string; subject: string; text: string };

// Sends an email via Resend. If no API key is configured, runs in "console mode"
// (logs the email instead of sending) so the app works out-of-the-box locally.
export async function sendEmail({ to, subject, text }: SendArgs): Promise<{ ok: boolean; mode: "sent" | "console"; error?: string }> {
  if (!apiKey) {
    console.log("\n📧 [console mode — no RESEND_API_KEY set]");
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${text}\n`);
    return { ok: true, mode: "console" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) return { ok: false, mode: "sent", error: error.message };
    return { ok: true, mode: "sent" };
  } catch (e) {
    return { ok: false, mode: "sent", error: e instanceof Error ? e.message : "Unknown error" };
  }
}
