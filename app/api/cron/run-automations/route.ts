import { runTimeWorkflows } from "@/lib/automation";

// Daily scheduler endpoint. Vercel Cron (or any external cron) calls this once a
// day to fire the time-based automations (birthday, win-back) — guaranteed,
// even if nobody opens the app.
//
// Security: if CRON_SECRET is set, the caller must send
//   Authorization: Bearer <CRON_SECRET>
// Vercel Cron automatically sends this header when CRON_SECRET is configured.
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const result = await runTimeWorkflows(true); // force = ignore once-daily guard
    return Response.json({
      ok: true,
      actions: result.actions,
      ranAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Cron run-automations failed:", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
