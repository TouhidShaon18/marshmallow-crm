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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.next();

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = (payload.role as string) ?? "SALES";

    if (role === "MARKETING") {
      // Marketing can't see Sales-only routes → redirect to their home
      if (matchesAny(pathname, SALES_ONLY)) {
        return NextResponse.redirect(new URL("/marketing", request.url));
      }
    }

    if (role === "SALES" || role === "EMPLOYEE") {
      // Sales can't see Marketing-only or Finance-only routes
      if (matchesAny(pathname, MARKETING_ONLY) || matchesAny(pathname, FINANCE_ONLY)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    if (role === "MARKETING") {
      if (matchesAny(pathname, FINANCE_ONLY)) {
        return NextResponse.redirect(new URL("/marketing", request.url));
      }
    }

    if (role === "FINANCE") {
      // Finance can only see Finance routes — redirect Sales/Marketing routes
      if (matchesAny(pathname, SALES_ONLY) || matchesAny(pathname, MARKETING_ONLY)) {
        return NextResponse.redirect(new URL("/finance", request.url));
      }
    }
  } catch {
    // Expired / invalid JWT — let the page-level auth handle it
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
