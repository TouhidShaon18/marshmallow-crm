import { runNuportSync } from "@/lib/nuport-sync";

/**
 * Hourly cron — syncs new Nuport customers into the CRM.
 * Vercel Cron calls this with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const result = await runNuportSync();
    return Response.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    console.error("Nuport sync cron failed:", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
