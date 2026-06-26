import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "mc_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me",
);

export type AppRole = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "MARKETING" | "EMPLOYEE" | "FINANCE";

export type Department = "SALES" | "MARKETING" | "FINANCE";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  departments: string[]; // department sections this user can access
};

/** EMPLOYEE is the legacy name for SALES — normalise everywhere. */
export function normaliseRole(role: string): AppRole {
  if (role === "EMPLOYEE") return "SALES";
  return role as AppRole;
}

export function isSalesRole(role: AppRole) {
  return role === "SALES" || role === "EMPLOYEE";
}

export function isMarketingRole(role: AppRole) {
  return role === "MARKETING";
}

/**
 * "Elevated Sales+Marketing access" — Super Admin (OWNER), Admin, or the
 * Sales & Marketing Manager. These see all Sales + Marketing sections and the
 * team. Most full-access gates use this. (Finance is gated separately so the
 * Manager is excluded — see canAccessFinance / isAdminRole.)
 */
export function isOwnerRole(role: AppRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

/** OWNER or ADMIN only (excludes the Manager). For finance config & admin gates. */
export function isAdminRole(role: AppRole) {
  return role === "OWNER" || role === "ADMIN";
}

/** Department sections implied by an elevated/single-department role. */
export function deptsForRole(role: AppRole): Department[] {
  if (role === "OWNER" || role === "ADMIN") return ["SALES", "MARKETING", "FINANCE"];
  if (role === "MANAGER")   return ["SALES", "MARKETING"];
  if (role === "MARKETING") return ["MARKETING"];
  if (role === "FINANCE")   return ["FINANCE"];
  return ["SALES"]; // SALES / EMPLOYEE
}

/**
 * The department sections a user can actually access. Elevated roles
 * (Owner/Admin/Manager) are driven by their role; everyone else uses their
 * stored `departments` (falling back to the role's implied set).
 */
export function effectiveDepartments(role: AppRole, departments?: string[] | null): string[] {
  if (role === "OWNER" || role === "ADMIN" || role === "MANAGER") return deptsForRole(role);
  return departments && departments.length > 0 ? departments : deptsForRole(role);
}

export function canAccessSales(role: AppRole, departments?: string[] | null) {
  return effectiveDepartments(role, departments).includes("SALES");
}
export function canAccessMarketing(role: AppRole, departments?: string[] | null) {
  return effectiveDepartments(role, departments).includes("MARKETING");
}
/** Finance access — owner/admin always; otherwise needs the FINANCE department. */
export function canAccessFinance(role: AppRole, departments?: string[] | null) {
  if (role === "OWNER" || role === "ADMIN") return true;
  return effectiveDepartments(role, departments).includes("FINANCE");
}

/** Sales & Marketing Manager — full Sales + Marketing, no Finance/Settings. */
export function isManagerRole(role: AppRole) {
  return role === "MANAGER";
}

/**
 * Strict Super-Admin check. ONLY the OWNER may touch API keys & integrations
 * (Settings page, Nuport, GMB, WooCommerce). Admins are excluded.
 */
export function isSuperAdminRole(role: AppRole) {
  return role === "OWNER";
}

export function isFinanceRole(role: AppRole) {
  return role === "FINANCE";
}

/** Roles a user with `actor` role is allowed to create/remove. */
export function assignableRoles(actor: AppRole): AppRole[] {
  if (actor === "OWNER")   return ["SALES", "MARKETING", "FINANCE", "MANAGER", "ADMIN", "OWNER"];
  if (actor === "ADMIN")   return ["SALES", "MARKETING", "FINANCE", "MANAGER"];
  if (actor === "MANAGER") return ["SALES", "MARKETING"];
  return [];
}

/** Department areas an actor may grant to staff. */
export function assignableDepartments(actor: AppRole): Department[] {
  if (actor === "OWNER" || actor === "ADMIN") return ["SALES", "MARKETING", "FINANCE"];
  if (actor === "MANAGER") return ["SALES", "MARKETING"];
  return [];
}

/** Elevated management tiers a creator may assign (Manager/Admin/Super Admin). */
export function assignableTiers(actor: AppRole): AppRole[] {
  return assignableRoles(actor).filter((r) => r === "MANAGER" || r === "ADMIN" || r === "OWNER");
}

/** Label shown in the UI for a role. */
export function roleLabel(role: AppRole) {
  if (role === "OWNER")     return "Super Admin";
  if (role === "ADMIN")     return "Admin";
  if (role === "MANAGER")   return "Sales & Marketing Manager";
  if (role === "MARKETING") return "Marketing";
  if (role === "FINANCE")   return "Finance";
  return "Sales";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Create a signed session cookie.
// Role is stored in the JWT so middleware can read it without hitting the DB.
export async function createSession(
  userId: string,
  role: string,
  departments: string[] = [],
  rememberMe = true,
): Promise<void> {
  const expiry = rememberMe ? "30d" : "1d";
  const token = await new SignJWT({ uid: userId, role: normaliseRole(role), departments })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = payload.uid as string;
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normaliseRole(user.role),
      departments: user.departments ?? [],
    };
  } catch {
    return null;
  }
}
