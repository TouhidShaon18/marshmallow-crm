"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { runEventWorkflows, runTimeWorkflows } from "@/lib/automation";

type TaskChannel = "WHATSAPP" | "EMAIL" | "CALL" | "TASK";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function int(fd: FormData, key: string, fallback = 0): number {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asChannel(v: string | null): TaskChannel {
  return v === "EMAIL" || v === "CALL" || v === "TASK" ? v : "WHATSAPP";
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Replace {name} {anime} {product} {gift} in a template with customer values.
function mergeFields(
  template: string | null,
  c: { name: string; favouriteAnime: string | null; productBought: string | null; giftReceived: string | null },
): string | null {
  if (!template) return null;
  return template
    .replace(/\{name\}/gi, c.name)
    .replace(/\{anime\}/gi, c.favouriteAnime ?? "")
    .replace(/\{product\}/gi, c.productBought ?? "")
    .replace(/\{gift\}/gi, c.giftReceived ?? "");
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// ---------- sequences ----------
export async function createSequence(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  await requireUser();
  const name = str(formData, "name");
  if (!name) return { error: "Give the sequence a name." };
  const seq = await prisma.sequence.create({
    data: { name, description: str(formData, "description") },
  });
  revalidatePath("/sequences");
  redirect(`/sequences/${seq.id}`);
}

export async function addSequenceStep(formData: FormData): Promise<void> {
  await requireUser();
  const sequenceId = str(formData, "sequenceId");
  const title = str(formData, "title");
  if (!sequenceId || !title) return;
  const count = await prisma.sequenceStep.count({ where: { sequenceId } });
  await prisma.sequenceStep.create({
    data: {
      sequenceId,
      order: count + 1,
      dayOffset: Math.max(0, int(formData, "dayOffset", 0)),
      channel: asChannel(str(formData, "channel")),
      title,
      message: str(formData, "message"),
    },
  });
  revalidatePath(`/sequences/${sequenceId}`);
}

export async function deleteSequenceStep(stepId: string, sequenceId: string): Promise<void> {
  await requireUser();
  await prisma.sequenceStep.delete({ where: { id: stepId } });
  revalidatePath(`/sequences/${sequenceId}`);
}

export async function deleteSequence(id: string): Promise<void> {
  await requireUser();
  await prisma.sequence.delete({ where: { id } });
  revalidatePath("/sequences");
  redirect("/sequences");
}

export async function toggleSequenceActive(id: string, active: boolean): Promise<void> {
  await requireUser();
  await prisma.sequence.update({ where: { id }, data: { active } });
  revalidatePath("/sequences");
  revalidatePath(`/sequences/${id}`);
}

// ---------- enrollment ----------
export async function enrollCustomer(formData: FormData): Promise<void> {
  await requireUser();
  const customerId = str(formData, "customerId");
  const sequenceId = str(formData, "sequenceId");
  if (!customerId || !sequenceId) return;

  const [customer, steps] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.sequenceStep.findMany({ where: { sequenceId }, orderBy: { order: "asc" } }),
  ]);
  if (!customer || steps.length === 0) return;

  const enrollment = await prisma.enrollment.create({
    data: { customerId, sequenceId },
  });

  const now = new Date();
  await prisma.task.createMany({
    data: steps.map((s) => ({
      customerId,
      enrollmentId: enrollment.id,
      stepId: s.id,
      assignedToId: customer.assignedToId,
      channel: s.channel,
      title: mergeFields(s.title, customer) ?? s.title,
      message: mergeFields(s.message, customer),
      dueAt: addDays(now, s.dayOffset),
    })),
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/tasks");
}

export async function cancelEnrollment(enrollmentId: string, customerId: string): Promise<void> {
  await requireUser();
  // Cancel enrollment and drop its still-pending tasks.
  await prisma.task.deleteMany({ where: { enrollmentId, status: "PENDING" } });
  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "CANCELLED" } });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/tasks");
}

// ---------- tasks ----------
const channelToInteraction: Record<TaskChannel, "WHATSAPP" | "EMAIL" | "CALL" | "NOTE"> = {
  WHATSAPP: "WHATSAPP",
  EMAIL: "EMAIL",
  CALL: "CALL",
  TASK: "NOTE",
};

export async function completeTask(taskId: string): Promise<void> {
  const user = await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== "PENDING") return;

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "DONE", completedAt: new Date() },
  });

  // Log it on the customer's timeline + mark contacted.
  await prisma.interaction.create({
    data: {
      customerId: task.customerId,
      employeeId: user.id,
      type: channelToInteraction[task.channel as TaskChannel],
      summary: `✓ ${task.title}${task.message ? `\n\n${task.message}` : ""}`,
    },
  });
  await prisma.customer.update({
    where: { id: task.customerId },
    data: { lastContactedAt: new Date() },
  });

  // If every task in the enrollment is finished, mark it completed.
  if (task.enrollmentId) {
    const remaining = await prisma.task.count({
      where: { enrollmentId: task.enrollmentId, status: "PENDING" },
    });
    if (remaining === 0) {
      await prisma.enrollment.update({
        where: { id: task.enrollmentId },
        data: { status: "COMPLETED" },
      });
    }
  }

  revalidatePath("/tasks");
  revalidatePath(`/customers/${task.customerId}`);
  revalidatePath("/followups");
  revalidatePath("/dashboard");
}

export async function skipTask(taskId: string): Promise<void> {
  await requireUser();
  await prisma.task.update({ where: { id: taskId }, data: { status: "SKIPPED" } });
  revalidatePath("/tasks");
}

export async function snoozeTask(taskId: string, days: number): Promise<void> {
  await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  await prisma.task.update({
    where: { id: taskId },
    data: { dueAt: addDays(new Date(), days) },
  });
  revalidatePath("/tasks");
}

// Create a quick one-off task (not tied to a sequence).
export async function createQuickTask(formData: FormData): Promise<void> {
  const user = await requireUser();
  const customerId = str(formData, "customerId");
  const title = str(formData, "title");
  if (!customerId || !title) return;
  const dueDays = Math.max(0, int(formData, "dueDays", 0));
  await prisma.task.create({
    data: {
      customerId,
      assignedToId: user.id,
      channel: asChannel(str(formData, "channel")),
      title,
      message: str(formData, "message"),
      dueAt: addDays(new Date(), dueDays),
    },
  });
  revalidatePath("/tasks");
  revalidatePath(`/customers/${customerId}`);
}

// ---------- automations (workflows) ----------
const TRIGGERS = ["CUSTOMER_CREATED", "STAGE_CHANGED", "BIRTHDAY_SOON", "NO_CONTACT"];

export async function createWorkflow(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireUser();
  const name = str(formData, "name");
  const trigger = str(formData, "trigger");
  const action = str(formData, "action") === "CREATE_TASK" ? "CREATE_TASK" : "ENROLL_SEQUENCE";
  if (!name) return { error: "Name your automation." };
  if (!trigger || !TRIGGERS.includes(trigger)) return { error: "Pick a trigger." };

  const stageRaw = str(formData, "triggerStage");
  const triggerStage = trigger === "STAGE_CHANGED" && stageRaw && STAGES.includes(stageRaw) ? stageRaw : null;
  const daysBefore = trigger === "BIRTHDAY_SOON" ? Math.max(0, int(formData, "daysBefore", 3)) : null;
  const inactivityDays = trigger === "NO_CONTACT" ? Math.max(1, int(formData, "inactivityDays", 30)) : null;

  const actionSequenceId = action === "ENROLL_SEQUENCE" ? str(formData, "actionSequenceId") : null;
  const taskTitle = action === "CREATE_TASK" ? str(formData, "taskTitle") : null;

  if (action === "ENROLL_SEQUENCE" && !actionSequenceId) return { error: "Choose a sequence to enroll into." };
  if (action === "CREATE_TASK" && !taskTitle) return { error: "Give the task a title." };

  await prisma.workflow.create({
    data: {
      name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trigger: trigger as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      triggerStage: triggerStage as any,
      daysBefore,
      inactivityDays,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      action: action as any,
      actionSequenceId,
      taskChannel: action === "CREATE_TASK" ? asChannel(str(formData, "taskChannel")) : null,
      taskTitle,
      taskMessage: action === "CREATE_TASK" ? str(formData, "taskMessage") : null,
    },
  });
  revalidatePath("/automations");
  return { ok: true };
}

export async function toggleWorkflow(id: string, active: boolean): Promise<void> {
  await requireUser();
  await prisma.workflow.update({ where: { id }, data: { active } });
  revalidatePath("/automations");
}

export async function deleteWorkflow(id: string): Promise<void> {
  await requireUser();
  await prisma.workflow.delete({ where: { id } });
  revalidatePath("/automations");
}

export async function runAutomationsNow(): Promise<void> {
  await requireUser();
  await runTimeWorkflows(true);
  revalidatePath("/automations");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

// ---------- pipeline ----------
const STAGES = ["NEW_LEAD", "CONTACTED", "INTERESTED", "PURCHASED", "REPEAT", "LOST"];

export async function moveStage(formData: FormData): Promise<void> {
  await requireUser();
  const customerId = str(formData, "customerId");
  const stage = str(formData, "stage");
  if (!customerId || !stage || !STAGES.includes(stage)) return;
  const customer = await prisma.customer.update({
    where: { id: customerId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { stage: stage as any },
  });
  await runEventWorkflows("STAGE_CHANGED", customer);
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  revalidatePath(`/customers/${customerId}`);
}
