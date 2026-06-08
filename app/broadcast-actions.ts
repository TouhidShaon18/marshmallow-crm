"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audienceWhere } from "@/lib/audience";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const STAGES = ["NEW_LEAD", "CONTACTED", "INTERESTED", "PURCHASED", "REPEAT", "LOST"];

export async function createBroadcast(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();

  const channel = str(formData, "channel") === "EMAIL" ? "EMAIL" : "SMS";
  const name = str(formData, "name");
  const message = str(formData, "message");
  if (!name) return { error: "Give your promotion a name." };
  if (!message) return { error: "Write the message." };

  const stageRaw = str(formData, "filterStage");
  const filterStage = stageRaw && STAGES.includes(stageRaw) ? stageRaw : null;
  const pcRaw = str(formData, "filterPurchaseChannel");
  const filterPurchaseChannel = pcRaw === "ONLINE" || pcRaw === "OFFLINE" ? pcRaw : null;
  const filterAnime = str(formData, "filterAnime");
  const filterRepeatOnly = formData.get("filterRepeatOnly") != null;

  const count = await prisma.customer.count({
    where: audienceWhere({ channel, filterStage, filterAnime, filterPurchaseChannel, filterRepeatOnly }),
  });

  const b = await prisma.broadcast.create({
    data: {
      channel,
      name,
      subject: channel === "EMAIL" ? str(formData, "subject") : null,
      message,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterStage: filterStage as any,
      filterAnime,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterPurchaseChannel: filterPurchaseChannel as any,
      filterRepeatOnly,
      recipientCount: count,
      createdById: user.id,
    },
  });

  revalidatePath("/broadcasts");
  redirect(`/broadcasts/${b.id}`);
}

export async function deleteBroadcast(id: string): Promise<void> {
  await requireUser();
  await prisma.broadcast.delete({ where: { id } });
  revalidatePath("/broadcasts");
  redirect("/broadcasts");
}

// Mark a broadcast as sent. Optionally log it on each recipient's timeline.
export async function markBroadcastSent(id: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const b = await prisma.broadcast.findUnique({ where: { id } });
  if (!b) return;

  const where = audienceWhere({
    channel: b.channel,
    filterStage: b.filterStage,
    filterAnime: b.filterAnime,
    filterPurchaseChannel: b.filterPurchaseChannel,
    filterRepeatOnly: b.filterRepeatOnly,
  });

  const logToTimeline = formData.get("logToTimeline") != null;
  const recipients = await prisma.customer.findMany({ where, select: { id: true } });

  if (logToTimeline && recipients.length > 0) {
    await prisma.interaction.createMany({
      data: recipients.map((c) => ({
        customerId: c.id,
        employeeId: user.id,
        type: b.channel === "EMAIL" ? ("EMAIL" as const) : ("SMS" as const),
        summary: `📣 Promo ${b.channel}: "${b.name}"`,
      })),
    });
  }

  await prisma.broadcast.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date(), recipientCount: recipients.length },
  });

  revalidatePath("/broadcasts");
  revalidatePath(`/broadcasts/${id}`);
}
