/**
 * keycloak.ts — Keycloak JS Adapter Singleton
 *
 * Menyediakan instance Keycloak yang reusable (tidak di-reinit setiap render).
 * HANYA boleh dieksekusi di sisi client (browser), bukan di SSR/server.
 *
 * Source: PRD Bagian III — SSO Keycloak Integration (Pemkab Purbalingga)
 */

import Keycloak from "keycloak-js";
import type { UserContext, JWTPayload, UserRole } from "@/types/auth";
import { parseJwtPayload } from "@/lib/auth/session";

// ── Konfigurasi Keycloak dari environment variables ──────────────
const keycloakConfig = {
  url:      process.env.NEXT_PUBLIC_KEYCLOAK_URL      ?? "https://accounts.purbalinggakab.go.id/auth",
  realm:    process.env.NEXT_PUBLIC_KEYCLOAK_REALM    ?? "apps",
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "e-notulen",
  credentials: {
    secret: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET ?? "",
  },
};

// ── Singleton instance (hanya satu instance di seluruh app) ──────
let keycloakInstance: Keycloak | null = null;

/**
 * Mendapatkan URL Login Keycloak untuk manual OIDC redirect.
 * Ini menghindari penggunaan keycloak-js yang menyebabkan error CORS
 * pada confidential client.
 */
export function getKeycloakLoginUrl(redirectUri: string): string {
  const { url, realm, clientId } = keycloakConfig;
  return `${url}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid`;
}

/**
 * Mendapatkan instance Keycloak yang sudah dikonfigurasi.
 * Membuat instance baru hanya jika belum ada (Singleton Pattern).
 * Mengembalikan objek kosong jika dipanggil di Server Side (SSR).
 */
export function getKeycloakInstance(): Keycloak {
  // Guard: keycloak-js tidak bisa berjalan di server side (tidak ada `window`)
  if (typeof window === "undefined") {
    return {} as Keycloak;
  }

  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
  }

  return keycloakInstance;
}

/**
 * Reset instance (digunakan saat logout agar tidak ada state sisa)
 */
export function resetKeycloakInstance(): void {
  keycloakInstance = null;
}

// ── Helper: Konversi JWT Payload Keycloak → UserContext ──────────
/**
 * Mengubah raw JWT payload dari Keycloak menjadi format UserContext
 * yang digunakan di seluruh UI aplikasi e-Notulen.
 */
export function mapJwtToUserContext(token: string): UserContext | null {
  const payload = parseJwtPayload<JWTPayload>(token);
  if (!payload) return null;

  // Ambil role dari resource_access["e-notulen"].roles
  const roles = payload.resource_access?.["e-notulen"]?.roles ?? [];
  const role: UserRole =
    roles.includes("admin")    ? "admin"    :
    roles.includes("operator") ? "operator" :
    roles.includes("officer")  ? "officer"  :
    "officer"; // default fallback

  // Build UserContext berdasarkan role
  const base: UserContext = {
    sub:              payload.sub,
    role,
    displayName:      payload.name ?? payload.sub,
    email:            payload.email,
    preferredUsername: payload.name,
  };

  if (role === "operator") {
    base.opdCode = payload.kode_unit;
    // Use the name claim as OPD display name if available (set by Keycloak from SKPD data)
    // Fallback to payload.name which for operator accounts is the OPD name, not personal name
    base.opdName = payload.name ?? (payload.kode_unit ? `OPD ${payload.kode_unit}` : undefined);
  }

  if (role === "officer" && payload.officer) {
    base.opdCode  = payload.officer.unit?.id;
    base.opdName  = payload.officer.unit?.nama;
    base.nip      = payload.officer.nip;
    base.jabatan  = payload.officer.jabatan?.nama;
    base.golongan = payload.officer.golongan;
    base.foto     = payload.officer.foto;
    base.officer  = payload.officer;
  }

  return base;
}
