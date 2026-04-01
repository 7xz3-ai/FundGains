// middleware.ts
// Protects /dashboard and /profile routes.
// Since auth is wallet-based (no session cookies), we rely on
// client-side redirect in pages. This middleware adds an extra
// server-side check for the cron route secret.

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect cron routes — only callable with CRON_SECRET header
  if (pathname.startsWith("/api/cron/")) {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/cron/:path*"],
};
