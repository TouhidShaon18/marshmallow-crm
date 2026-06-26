"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  isOwnerRole,
  assignableRoles,
  assignableDepartments,
  assignableTiers,
  deptsForRole,
  normaliseRole,
  type AppRole,
  type Department,
} from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { parseCustomerFile } from "@/lib/import";
import { runEventWorkflows } from "@/lib/automation";

// ---------- helpers (not exported) ----------
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

// ---------- auth ----------
export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = str(formData, "email")?.toLowerCase();
  const password = str(formData, "password");
  if (!email || !password) return { error: "Email and password are required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }
  const rememberMe = formData.get("rememberMe") != null;
  await createSession(user.id, user.role, user.departments ?? [], rememberMe);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---------- customers ----------
function customerDataFromForm(fd: FormData) {
  const birthdayRaw = str(fd, "birthday");
  const orderRaw = str(fd, "orderAmount");
  return {
    name: str(fd, "name") ?? "Unnamed",
    address: str(fd, "address"),
    favouriteAnime: str(fd, "favouriteAnime"),
    whatsappNumber: str(fd, "whatsappNumber"),
    email: str(fd, "email"),
    productBought: str(fd, "productBought"),
    channel: (str(fd, "channel") === "ONLINE" ? "ONLINE" : "OFFLINE") as
      | "ONLINE"
      | "OFFLINE",
    giftReceived: str(fd, "giftReceived"),
    birthday: birthdayRaw ? new Date(birthdayRaw) : null,
    orderAmount: orderRaw ? Number(orderRaw) : null,
    repeatCustomer: fd.get("repeatCustomer") != null,
    leadSource: str(fd, "leadSource") || null,
    assignedToId: str(fd, "assignedToId"),
  };
}

export async function createCustomer(formData: FormData): Promise<void> {
  await requireUser();
  const data = customerDataFromForm(formData);
  const stampCount = data.orderAmount != null && data.orderAmount >= 1000 ? 1 : 0;
  const customer = await prisma.customer.create({ data: { ...data, stampCount } });
  await runEventWorkflows("CUSTOMER_CREATED", customer);
  revalidatePath("/customers");
  revalidatePath("/tasks");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData): Promise<void> {
  await requireUser();
  const data = customerDataFromForm(formData);
  await prisma.customer.update({ where: { id }, data });
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string): Promise<void> {
  await requireUser();
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
}

// Bulk delete — restricted to admins/super admins (mass-destructive).
export async function bulkDeleteCustomers(
  ids: string[],
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const user = await requireUser();
  if (!isOwnerRole(user.role)) return { ok: false, deleted: 0, error: "Not allowed." };
  const clean = (ids ?? []).filter((id) => typeof id === "string" && id.length > 0);
  if (clean.length === 0) return { ok: false, deleted: 0, error: "Nothing selected." };
  const res = await prisma.customer.deleteMany({ where: { id: { in: clean } } });
  revalidatePath("/customers");
  revalidatePath("/followups");
  return { ok: true, deleted: res.count };
}

// ---------- interactions (conversation log) ----------
export async function addInteraction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const customerId = str(formData, "customerId");
  const summary = str(formData, "summary");
  const typeRaw = str(formData, "type") ?? "NOTE";
  const type = (["WHATSAPP", "EMAIL", "CALL", "NOTE"].includes(typeRaw)
    ? typeRaw
    : "NOTE") as "WHATSAPP" | "EMAIL" | "CALL" | "NOTE";

  if (!customerId || !summary) return;

  await prisma.interaction.create({
    data: { customerId, employeeId: user.id, type, summary },
  });
  await prisma.customer.update({
    where: { id: customerId },
    data: { lastContactedAt: new Date() },
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/followups");
}

// ---------- email ----------
export async function sendCustomerEmail(
  _prev: { ok?: boolean; message?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; message?: string }> {
  const user = await requireUser();
  const customerId = str(formData, "customerId");
  const to = str(formData, "to");
  const subject = str(formData, "subject");
  const body = str(formData, "body");

  if (!customerId || !to || !subject || !body) {
    return { ok: false, message: "All fields are required." };
  }

  const result = await sendEmail({ to, subject, text: body });
  if (!result.ok) {
    return { ok: false, message: `Could not send: ${result.error}` };
  }

  // Log the email on the customer's timeline + update last contacted.
  await prisma.interaction.create({
    data: {
      customerId,
      employeeId: user.id,
      type: "EMAIL",
      summary: `Email sent — "${subject}"\n\n${body}`,
    },
  });
  await prisma.customer.update({
    where: { id: customerId },
    data: { lastContactedAt: new Date() },
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/followups");

  return {
    ok: true,
    message:
      result.mode === "console"
        ? "Logged. (Email service not configured yet — printed to server console.)"
        : "Email sent and logged on the timeline.",
  };
}

// ---------- bulk import (Excel / CSV) ----------
export type ImportState = {
  ok?: boolean;
  created?: number;
  skipped?: number;
  matched?: string[];
  errors?: string[];
  message?: string;
};

export async function importCustomers(
  _prev: ImportState | undefined,
  formData: FormData,
): Promise<ImportState> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Please choose a file to upload." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "File is too large (max 5 MB)." };
  }

  // Optionally assign every imported customer to one employee.
  const assignedToId = str(formData, "assignedToId");

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = parseCustomerFile(buffer);
  } catch {
    return { ok: false, message: "Could not read that file. Please upload a .xlsx, .xls or .csv file." };
  }

  if (parsed.customers.length === 0) {
    return { ok: false, errors: parsed.errors, message: "No customers could be imported." };
  }

  const data = parsed.customers.map((c) => ({
    ...c,
    assignedToId,
    stampCount: c.orderAmount != null && c.orderAmount >= 1000 ? 1 : 0,
  }));
  const result = await prisma.customer.createMany({ data });

  revalidatePath("/customers");
  revalidatePath("/followups");

  return {
    ok: true,
    created: result.count,
    skipped: parsed.errors.length,
    matched: parsed.matchedColumns,
    errors: parsed.errors,
    message: `Imported ${result.count} customer${result.count === 1 ? "" : "s"}.`,
  };
}

// ---------- team (owner only) ----------
export async function createEmployee(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  if (!isOwnerRole(user.role)) return { error: "Only managers and admins can add team members." };

  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase();
  const password = str(formData, "password");
  const actor = normaliseRole(user.role);
  const tier = str(formData, "tier") ?? "STAFF";

  let role: AppRole;
  let departments: Department[];

  if (tier === "MANAGER" || tier === "ADMIN" || tier === "OWNER") {
    if (!assignableTiers(actor).includes(tier as AppRole)) {
      return { error: "You're not allowed to create that role." };
    }
    role = tier as AppRole;
    departments = deptsForRole(role);
  } else {
    // Staff — access driven by the chosen department toggles.
    const allowedDepts = assignableDepartments(actor);
    const chosen = formData.getAll("dept")
      .map((d) => d.toString())
      .filter((d): d is Department => (allowedDepts as string[]).includes(d));
    if (chosen.length === 0) return { error: "Pick at least one access area (Sales / Marketing / Finance)." };
    // Primary role for labelling/targets; full access via departments.
    role = chosen.includes("SALES") ? "SALES" : chosen.includes("MARKETING") ? "MARKETING" : "FINANCE";
    departments = chosen;
  }

  if (!name || !email || !password) {
    return { error: "Name, email and password are required." };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists." };

  await prisma.user.create({
    data: { name, email, role, departments, passwordHash: await hashPassword(password) },
  });
  revalidatePath("/team");
  return { ok: true };
}

/** Update a staff member's department access (Sales / Marketing / Finance toggles). */
export async function updateUserAccess(userId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!isOwnerRole(user.role)) return;
  const actor = normaliseRole(user.role);

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return;
  // Only staff access is toggle-driven; elevated roles get access from their role.
  if (!["SALES", "MARKETING", "FINANCE", "EMPLOYEE"].includes(target.role)) return;

  const allowedDepts = assignableDepartments(actor) as string[];
  const chosen = formData.getAll("dept").map((d) => d.toString()).filter((d) => allowedDepts.includes(d)) as Department[];
  if (chosen.length === 0) return;
  const role: AppRole = chosen.includes("SALES") ? "SALES" : chosen.includes("MARKETING") ? "MARKETING" : "FINANCE";

  await prisma.user.update({ where: { id: userId }, data: { role, departments: chosen } });
  revalidatePath("/team");
}

export async function deleteEmployee(id: string): Promise<void> {
  const user = await requireUser();
  if (!isOwnerRole(user.role)) return;
  if (user.id === id) return; // can't delete yourself

  // You can only remove people whose role you're allowed to assign.
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target && !assignableRoles(normaliseRole(user.role)).includes(normaliseRole(target.role))) return;
  // Unassign their customers, keep history intact.
  await prisma.customer.updateMany({
    where: { assignedToId: id },
    data: { assignedToId: null },
  });
  await prisma.user.delete({ where: { id } });
  revalidatePath("/team");
}
