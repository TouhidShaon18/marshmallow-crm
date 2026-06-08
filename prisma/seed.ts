import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function merge(t: string | null, c: { name: string; favouriteAnime: string | null; productBought: string | null }) {
  if (!t) return null;
  return t
    .replace(/\{name\}/gi, c.name)
    .replace(/\{anime\}/gi, c.favouriteAnime ?? "")
    .replace(/\{product\}/gi, c.productBought ?? "");
}

// Enroll one customer into a sequence to populate the Today task list (idempotent).
async function enrollFirstCustomer(sequenceId: string) {
  const existing = await prisma.enrollment.findFirst({ where: { sequenceId } });
  if (existing) return;
  const customer = await prisma.customer.findFirst({ orderBy: { createdAt: "asc" } });
  if (!customer) return;
  const steps = await prisma.sequenceStep.findMany({ where: { sequenceId }, orderBy: { order: "asc" } });
  if (steps.length === 0) return;

  const enrollment = await prisma.enrollment.create({ data: { customerId: customer.id, sequenceId } });
  const now = new Date();
  await prisma.task.createMany({
    data: steps.map((s) => ({
      customerId: customer.id,
      enrollmentId: enrollment.id,
      stepId: s.id,
      assignedToId: customer.assignedToId,
      channel: s.channel,
      title: s.title,
      message: merge(s.message, customer),
      // shift earlier so the first task is already due today for the demo
      dueAt: addDays(now, s.dayOffset - 0),
    })),
  });
  console.log(`Enrolled ${customer.name} into the welcome sequence (${steps.length} tasks).`);
}

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // Owner + employee accounts
  const owner = await prisma.user.upsert({
    where: { email: "owner@marshmallow.crm" },
    update: {},
    create: {
      name: "Store Owner",
      email: "owner@marshmallow.crm",
      role: "OWNER",
      passwordHash: await hash("owner123"),
    },
  });

  const emp = await prisma.user.upsert({
    where: { email: "employee@marshmallow.crm" },
    update: {},
    create: {
      name: "Aiko (Staff)",
      email: "employee@marshmallow.crm",
      role: "EMPLOYEE",
      passwordHash: await hash("staff123"),
    },
  });

  // Sample follow-up sequence (idempotent by name).
  let welcome = await prisma.sequence.findFirst({ where: { name: "New Customer Welcome" } });
  if (!welcome) {
    welcome = await prisma.sequence.create({
      data: {
        name: "New Customer Welcome",
        description: "A 7-day welcome flow for new customers.",
        steps: {
          create: [
            { order: 1, dayOffset: 0, channel: "WHATSAPP", title: "Welcome message", message: "Hi {name}! 🍡 Thanks for shopping with us. Hope you love your {product}!" },
            { order: 2, dayOffset: 3, channel: "WHATSAPP", title: "Check in", message: "Hey {name}, how are you enjoying your order? Any questions?" },
            { order: 3, dayOffset: 7, channel: "EMAIL", title: "New {anime} arrivals", message: "Hi {name}, we just got new {anime} merch in — want first pick? 🎁" },
          ],
        },
      },
    });
    console.log("Created sample sequence: New Customer Welcome");
  }

  // Sample automations (idempotent by name).
  const workflowDefs = [
    {
      name: "Welcome new customers",
      trigger: "CUSTOMER_CREATED" as const,
      action: "ENROLL_SEQUENCE" as const,
      actionSequenceId: welcome.id,
    },
    {
      name: "Birthday wish",
      trigger: "BIRTHDAY_SOON" as const,
      daysBefore: 7,
      action: "CREATE_TASK" as const,
      taskChannel: "WHATSAPP" as const,
      taskTitle: "🎂 Wish happy birthday",
      taskMessage: "Happy birthday {name}! 🎉 As a gift, here's 15% off your next {anime} order this week.",
    },
    {
      name: "Win back quiet customers",
      trigger: "NO_CONTACT" as const,
      inactivityDays: 30,
      action: "CREATE_TASK" as const,
      taskChannel: "WHATSAPP" as const,
      taskTitle: "👋 Reconnect — gone quiet",
      taskMessage: "Hi {name}, we miss you! New {anime} arrivals just landed 🍡 — come take a look?",
    },
  ];
  for (const def of workflowDefs) {
    const exists = await prisma.workflow.findFirst({ where: { name: def.name } });
    if (!exists) await prisma.workflow.create({ data: def });
  }
  console.log("Sample automations ready.");

  // Only seed sample customers once.
  const count = await prisma.customer.count();
  if (count > 0) {
    console.log("Customers already exist — skipping sample customers.");
    await enrollFirstCustomer(welcome.id);
    return;
  }

  const samples = [
    {
      name: "Rumi Akter",
      address: "Dhanmondi, Dhaka",
      favouriteAnime: "Naruto",
      whatsappNumber: "+8801712345678",
      email: "rumi@example.com",
      productBought: "Naruto Hoodie (L)",
      channel: "ONLINE" as const,
      giftReceived: "Sticker pack",
      orderAmount: 1850,
      repeatCustomer: true,
      assignedToId: emp.id,
      lastContactedAt: daysAgo(9), // overdue follow-up
    },
    {
      name: "Tanvir Hasan",
      address: "Chittagong",
      favouriteAnime: "One Piece",
      whatsappNumber: "+8801812345678",
      email: "tanvir@example.com",
      productBought: "Luffy Figure",
      channel: "OFFLINE" as const,
      giftReceived: "Keychain",
      orderAmount: 3200,
      repeatCustomer: false,
      assignedToId: emp.id,
      lastContactedAt: daysAgo(2), // recent
    },
    {
      name: "Mitu Rahman",
      address: "Sylhet",
      favouriteAnime: "Demon Slayer",
      whatsappNumber: "+8801912345678",
      email: "mitu@example.com",
      productBought: "Tanjiro Poster Set",
      channel: "ONLINE" as const,
      giftReceived: null,
      orderAmount: 950,
      repeatCustomer: false,
      assignedToId: owner.id,
      lastContactedAt: null, // never contacted — needs follow-up
    },
  ];

  for (const s of samples) {
    const c = await prisma.customer.create({ data: s });
    if (s.lastContactedAt) {
      await prisma.interaction.create({
        data: {
          customerId: c.id,
          employeeId: s.assignedToId,
          type: "WHATSAPP",
          summary: "Confirmed delivery and asked about the product. Customer was happy.",
          createdAt: s.lastContactedAt,
        },
      });
    }
  }

  await enrollFirstCustomer(welcome.id);

  console.log("Seed complete ✅");
  console.log("  Owner:    owner@marshmallow.crm / owner123");
  console.log("  Employee: employee@marshmallow.crm / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
