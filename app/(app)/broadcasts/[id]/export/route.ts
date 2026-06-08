import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audienceWhere, mergeMessage } from "@/lib/audience";

function csvCell(v: string | null): string {
  const s = (v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const b = await prisma.broadcast.findUnique({ where: { id } });
  if (!b) return new Response("Not found", { status: 404 });

  const recipients = await prisma.customer.findMany({
    where: audienceWhere({
      channel: b.channel,
      filterStage: b.filterStage,
      filterAnime: b.filterAnime,
      filterPurchaseChannel: b.filterPurchaseChannel,
      filterRepeatOnly: b.filterRepeatOnly,
    }),
    select: { name: true, whatsappNumber: true, email: true, favouriteAnime: true, productBought: true, giftReceived: true },
    orderBy: { name: "asc" },
  });

  const isSMS = b.channel === "SMS";
  const header = isSMS ? ["Name", "Phone", "Message"] : ["Name", "Email", "Subject", "Message"];

  const rows = recipients.map((c) => {
    const msg = mergeMessage(b.message, c);
    return isSMS
      ? [csvCell(c.name), csvCell(c.whatsappNumber), csvCell(msg)].join(",")
      : [csvCell(c.name), csvCell(c.email), csvCell(b.subject), csvCell(msg)].join(",");
  });

  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");
  const safeName = b.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "broadcast"}-recipients.csv"`,
    },
  });
}
