import "server-only";
import { prisma } from "@/lib/db";
import { mergeMessage } from "@/lib/audience";

type CustomerLite = {
  id: string;
  name: string;
  favouriteAnime: string | null;
  productBought: string | null;
  giftReceived: string | null;
  assignedToId: string | null;
  stage?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Workflow = any;

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Days until the customer's next birthday (0 = today), or null.
function daysUntilBirthday(birthday: Date | null): { days: number; date: Date } | null {
  if (!birthday) return null;
  const today = startOfToday();
  const b = new Date(birthday);
  let next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  return { days, date: next };
}

// Enroll a customer into a sequence, generating its dated tasks. Tagged with workflowId.
async function enrollIntoSequence(customerId: string, sequenceId: string, workflowId: string | null) {
  const [customer, steps] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.sequenceStep.findMany({ where: { sequenceId }, orderBy: { order: "asc" } }),
  ]);
  if (!customer || steps.length === 0) return;

  const enrollment = await prisma.enrollment.create({
    data: { customerId, sequenceId, workflowId },
  });
  const now = new Date();
  await prisma.task.createMany({
    data: steps.map((s) => ({
      customerId,
      enrollmentId: enrollment.id,
      stepId: s.id,
      workflowId,
      assignedToId: customer.assignedToId,
      channel: s.channel,
      title: mergeMessage(s.title, customer),
      message: s.message ? mergeMessage(s.message, customer) : null,
      dueAt: addDays(now, s.dayOffset),
    })),
  });
}

// Run a workflow's action against one customer. Idempotent. Returns true if it did something.
async function applyAction(w: Workflow, customer: CustomerLite, dueDate?: Date): Promise<boolean> {
  if (w.action === "ENROLL_SEQUENCE") {
    if (!w.actionSequenceId) return false;
    const exists = await prisma.enrollment.findFirst({
      where: { customerId: customer.id, sequenceId: w.actionSequenceId, status: "ACTIVE" },
    });
    if (exists) return false;
    await enrollIntoSequence(customer.id, w.actionSequenceId, w.id);
    return true;
  }

  // CREATE_TASK — skip if a pending task from this workflow already exists.
  const exists = await prisma.task.findFirst({
    where: { customerId: customer.id, workflowId: w.id, status: "PENDING" },
  });
  if (exists) return false;
  await prisma.task.create({
    data: {
      customerId: customer.id,
      workflowId: w.id,
      assignedToId: customer.assignedToId,
      channel: w.taskChannel ?? "TASK",
      title: w.taskTitle ?? "Follow up",
      message: w.taskMessage ? mergeMessage(w.taskMessage, customer) : null,
      dueAt: dueDate ?? new Date(),
    },
  });
  return true;
}

// Fire event-based workflows (called inline from create / stage-change actions).
export async function runEventWorkflows(
  trigger: "CUSTOMER_CREATED" | "STAGE_CHANGED",
  customer: CustomerLite,
): Promise<void> {
  const workflows = await prisma.workflow.findMany({ where: { active: true, trigger } });
  for (const w of workflows) {
    if (trigger === "STAGE_CHANGED" && w.triggerStage && w.triggerStage !== customer.stage) continue;
    try {
      await applyAction(w, customer);
    } catch (e) {
      console.error("Workflow error:", w.id, e);
    }
  }
}

// Evaluate time-based workflows (birthday / no-contact). Once per day per workflow unless forced.
export async function runTimeWorkflows(force = false): Promise<{ actions: number }> {
  const workflows = await prisma.workflow.findMany({
    where: { active: true, trigger: { in: ["BIRTHDAY_SOON", "NO_CONTACT"] } },
  });
  const today = startOfToday();
  let actions = 0;

  for (const w of workflows) {
    if (!force && w.lastRunAt && new Date(w.lastRunAt) >= today) continue;

    try {
      if (w.trigger === "BIRTHDAY_SOON") {
        const daysBefore = w.daysBefore ?? 3;
        const customers = await prisma.customer.findMany({ where: { birthday: { not: null } } });
        for (const c of customers) {
          const b = daysUntilBirthday(c.birthday);
          if (b && b.days <= daysBefore) {
            if (await applyAction(w, c, b.date)) actions++;
          }
        }
      } else {
        // NO_CONTACT — previously-contacted customers who've gone quiet.
        const days = w.inactivityDays ?? 30;
        const threshold = addDays(new Date(), -days);
        const customers = await prisma.customer.findMany({
          where: { lastContactedAt: { not: null, lt: threshold } },
        });
        for (const c of customers) {
          if (await applyAction(w, c)) actions++;
        }
      }
      await prisma.workflow.update({ where: { id: w.id }, data: { lastRunAt: new Date() } });
    } catch (e) {
      console.error("Time workflow error:", w.id, e);
    }
  }

  return { actions };
}
