import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * e-Notulen Auth Middleware
 *
 * Protects all routes under /(main) group.
 * In MOCK mode (NEXT_PUBLIC_USE_MOCK=true), auth checks are bypassed.
 * In production mode, validates the presence of the access_token cookie
 * which is set by the backend after successful Keycloak OIDC exchange.
 */

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/callback",
  "/auth/logout",
  "/api/auth",
  "/api/v1/public",
  "/absensi",
  // Static assets & Next internals
  "/_next",
  "/favicon.ico",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ── Mock mode: skip auth check ──────────────────────────────
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  if (useMock) {
    return NextResponse.next();
  }

  // ── Production: check access_token cookie ───────────────────
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!accessToken) {
    // If we have a refresh_token, try to get a new access_token
    if (refreshToken) {
      try {
        const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "https://accounts.purbalinggakab.go.id/auth";
        const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "apps";
        const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "e-notulen";
        const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET || "";
        
        const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

        const body = new URLSearchParams();
        body.append("grant_type", "refresh_token");
        body.append("refresh_token", refreshToken);
        body.append("client_id", clientId);
        if (clientSecret) {
          body.append("client_secret", clientSecret);
        }

        const res = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (res.ok) {
          const data = await res.json();
          const newAccessToken = data.access_token;
          const newRefreshToken = data.refresh_token || refreshToken;
          const maxAge = data.expires_in || 3600;
          const refreshMaxAge = data.refresh_expires_in || (maxAge * 2);

          // Update the request cookies so downstream server actions/components see the new token
          request.cookies.set("access_token", newAccessToken);
          request.cookies.set("refresh_token", newRefreshToken);

          // Create a response that continues the request but forwards the updated headers
          const response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          // Set the new cookies on the response so the browser saves them
          response.cookies.set("access_token", newAccessToken, { path: "/", maxAge: maxAge, sameSite: "lax" });
          response.cookies.set("refresh_token", newRefreshToken, { path: "/", maxAge: refreshMaxAge, sameSite: "lax" });

          return response;
        }
      } catch (err) {
        console.error("[Middleware] Failed to refresh token:", err);
      }
    }

    // Redirect to login page if no access_token and refresh failed/missing
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
