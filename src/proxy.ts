import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!authed && !isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authed && isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets, images, and the API's own auth routes
  // (login/logout must stay reachable to establish/clear the session, and
  // the cron + pinterest-oauth-callback routes authenticate themselves).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
