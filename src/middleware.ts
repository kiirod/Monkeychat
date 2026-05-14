import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals, API routes, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/users") ||
    pathname.includes(".") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Anything else like /kiirod → /users/kiirod
  return NextResponse.redirect(new URL(`/users${pathname}`, request.url));
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
