/**
 * session.ts — Session & token utilities
 *
 * Handles reading the access_token from HttpOnly cookies
 * (set by the backend after Keycloak OIDC exchange).
 * All token operations are done server-side or via API routes.
 */

// ── Token storage keys ────────────────────────────────────────
export const COOKIE_ACCESS_TOKEN  = "access_token";
export const COOKIE_REFRESH_TOKEN = "refresh_token";

// ── Parse JWT payload WITHOUT verification ────────────────────
// Verification is done by the Go backend on every request.
// Frontend only reads claims for UI purposes (display name, role, etc.).
export function parseJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Pad base64url string
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(padded.padEnd(padded.length + (4 - (padded.length % 4)) % 4, "="));
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

// ── Check if a JWT token is expired ───────────────────────────
export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload<{ exp: number }>(token);
  if (!payload?.exp) return true;
  // Add 30-second buffer for clock skew
  return Date.now() / 1000 > payload.exp - 30;
}

// ── Build Keycloak authorization URL ─────────────────────────
export function buildKeycloakAuthUrl(redirectUri: string, state?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER_URL ??
    "https://accounts.purbalinggakab.go.id/auth/realms/apps";
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "e-notulen";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    ...(state && { state }),
  });

  return `${baseUrl}/protocol/openid-connect/auth?${params.toString()}`;
}

// ── Build Keycloak logout URL ─────────────────────────────────
export function buildKeycloakLogoutUrl(postLogoutRedirectUri: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER_URL ??
    "https://accounts.purbalinggakab.go.id/auth/realms/apps";
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "e-notulen";

  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: postLogoutRedirectUri,
  });

  return `${baseUrl}/protocol/openid-connect/logout?${params.toString()}`;
}
