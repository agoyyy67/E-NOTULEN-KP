import { NextResponse } from "next/server";

/**
 * GET /auth/logout — Server-side logout handler
 *
 * Clears auth cookies and redirects to Keycloak's logout endpoint
 * to properly terminate the SSO session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const keycloakBaseUrl =
    process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER_URL ??
    "https://accounts.purbalinggakab.go.id/auth/realms/apps";
  const clientId =
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "e-notulen";
  const postLogoutRedirectUri = `${url.origin}/auth/login`;

  const logoutParams = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: postLogoutRedirectUri,
  });

  const keycloakLogoutUrl = `${keycloakBaseUrl}/protocol/openid-connect/logout?${logoutParams.toString()}`;

  const response = NextResponse.redirect(keycloakLogoutUrl);

  // Clear auth cookies
  response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });

  return response;
}
