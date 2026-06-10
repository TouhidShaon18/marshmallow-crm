import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "mc_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me",
);

export type AppRole = "OWNER" | "SALES" | "MARKETING" | "EMPLOYEE";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
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

export function isOwnerRole(role: AppRole) {
  return role === "OWNER";
}

/** Label shown in the UI for a role. */
export function roleLabel(role: AppRole) {
  if (role === "OWNER") return "Owner";
  if (role === "MARKETING") return "Marketing";
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
  rememberMe = true,
): Promise<void> {
  const expiry = rememberMe ? "30d" : "1d";
  const token = await new SignJWT({ uid: userId, role: normaliseRole(role) })
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
    };
  } catch {
    return null;
  }
}
