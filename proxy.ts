import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "mc_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me",
);

// Routes only Sales (and Owner) can access
const SALES_ONLY = [
  "/dashboard",
  "/customers",
  "/followups",
  "/tasks",
  "/pipeline",
  "/sequences",
  "/tags",
  "/team",
  "/loyalty",
];

// Routes only Marketing (and Owner) can access
const MARKETING_ONLY = [
  "/marketing",
  "/broadcasts",
  "/campaigns",
  "/automations",
  "/social-planner",
  "/influencers",
  "/affiliates",
];

// Routes only Finance (and Owner) can access
const FINANCE_ONLY = ["/finance"];

function matchesAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// The department sections a user can reach (mirrors lib/auth.effectiveDepartments,
// inlined here so proxy stays lightweight). Falls back to role when the JWT
// predates the departments field.
function effectiveDepts(role: string, departments: string[] | null): string[] {
  if (role === "OWNER" || role === "ADMIN") return ["SALES", "MARKETING", "FINANCE"];
  if (role === "MANAGER") return ["SALES", "MARKETING"];
  if (departments && departments.length > 0) return departments;
  if (role === "MARKETING") return ["MARKETING"];
  if (role === "FINANCE") return ["FINANCE"];
  return ["SALES"]; // SALES / EMPLOYEE
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.next();

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = (payload.role as string) ?? "SALES";
    const departments = Array.isArray(payload.departments) ? (payload.departments as string[]) : null;

    const depts = effectiveDepts(role, departments);
    const canSales     = depts.includes("SALES");
    const canMarketing = depts.includes("MARKETING");
    const canFinance   = depts.includes("FINANCE");
    const canSettings  = role === "OWNER";

    // Where to send someone who lacks access to the requested area.
    const home = canSales ? "/dashboard" : canMarketing ? "/marketing" : canFinance ? "/finance" : "/dashboard";
    const bounce = () => NextResponse.redirect(new URL(home, request.url));

    if (matchesAny(pathname, SALES_ONLY)     && !canSales)     return bounce();
    if (matchesAny(pathname, MARKETING_ONLY) && !canMarketing) return bounce();
    if (matchesAny(pathname, FINANCE_ONLY)   && !canFinance)   return bounce();
    if (matchesAny(pathname, ["/settings"])  && !canSettings)  return bounce();
  } catch {
    // Expired / invalid JWT — let the page-level auth handle it
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
