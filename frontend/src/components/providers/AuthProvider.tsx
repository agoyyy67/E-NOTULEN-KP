"use client";

/**
 * AuthProvider.tsx — Authentication Context Provider
 *
 * Provides UserContext throughout the app.
 * In MOCK mode (NEXT_PUBLIC_USE_MOCK=true):
 *   - Loads a mock user without actual Keycloak authentication
 *   - Exposes switchMockRole() for quick role switching during development
 * In PRODUCTION mode:
 *   - Reads user data from the server-side session (via /api/auth/me)
 *   - Handles token refresh automatically
 *
 * Source: PRD Bagian III — User Roles & Identity Resolution
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AuthContextValue, AuthState, UserContext, UserRole } from "@/types/auth";
import { MOCK_USERS } from "@/types/auth";

// ── Context ──────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Mock role persistence key ─────────────────────────────────
const MOCK_ROLE_KEY = "enotulen_mock_role";

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // ── Mock mode initialization ──────────────────────────────
  const initMock = useCallback(() => {
    const savedRole = (typeof window !== "undefined"
      ? (localStorage.getItem(MOCK_ROLE_KEY) as UserRole | null)
      : null) ?? "admin";

    const validRoles: UserRole[] = ["admin", "operator", "officer"];
    const role: UserRole = validRoles.includes(savedRole) ? savedRole : "admin";

    setState({
      user: MOCK_USERS[role],
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  // ── Production mode initialization ────────────────────────
  const initProduction = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      const json = await res.json();
      // /api/auth/me returns { success: true, data: UserContext }
      const user: UserContext = json.data ?? json.user;
      if (user) {
        setState({ user, isLoading: false, isAuthenticated: true });
      } else {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    if (isMock) {
      initMock();
    } else {
      initProduction();
    }
  }, [isMock, initMock, initProduction]);

  // ── Switch mock role (dev only) ───────────────────────────
  const switchMockRole = useCallback(
    (role: UserRole) => {
      if (!isMock) return;
      localStorage.setItem(MOCK_ROLE_KEY, role);
      setState({
        user: MOCK_USERS[role],
        isLoading: false,
        isAuthenticated: true,
      });
    },
    [isMock],
  );

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Bersihkan cookie access_token & refresh_token di browser
    document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "refresh_token=; path=/; max-age=0; SameSite=Lax";

    if (isMock) {
      // Mode Mock: bersihkan localStorage dan redirect ke login
      localStorage.removeItem(MOCK_ROLE_KEY);
      setState({ user: null, isLoading: false, isAuthenticated: false });
      window.location.href = "/auth/login";
    } else {
      // Mode Real Keycloak: redirect ke endpoint logout Keycloak
      // agar sesi SSO di server benar-benar dihapus
      const { buildKeycloakLogoutUrl } = await import("@/lib/auth/session");
      const postLogoutUri = window.location.origin + "/auth/login";
      const logoutUrl = buildKeycloakLogoutUrl(postLogoutUri);

      setState({ user: null, isLoading: false, isAuthenticated: false });
      window.location.href = logoutUrl;
    }
  }, [isMock]);

  const value: AuthContextValue = {
    ...state,
    logout,
    ...(isMock ? { switchMockRole } : {}),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
