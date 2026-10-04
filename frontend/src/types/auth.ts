/**
 * auth.ts — TypeScript types for authentication & JWT claims
 * Source: PRD Bagian III — User Roles & Identity Resolution
 *
 * Keycloak JWT claims structure for e-Notulen realm: apps, client: e-notulen
 */

// ── Role types ────────────────────────────────────────────────
export type UserRole = "admin" | "operator" | "officer";

// ── Keycloak JWT officer sub-claim ────────────────────────────
export interface OfficerUnit {
  id: string;       // OPD unit code (same as kode_unit)
  nama: string;     // OPD unit name
}

export interface OfficerJabatan {
  nama: string;     // e.g. "Analis Kebijakan Ahli Muda"
  jenjang?: string; // e.g. "Ahli Muda"
}

export interface OfficerClaims {
  nip: string;
  nama: string;        // Full name with titles
  gelar_depan?: string;
  gelar_belakang?: string;
  unit: OfficerUnit;
  sub_unit?: string;
  jabatan: OfficerJabatan;
  golongan?: string;   // e.g. "III/c"
  foto?: string;       // URL to photo (from Keycloak)
}

// ── Raw JWT payload (as received from Keycloak) ───────────────
export interface JWTPayload {
  sub: string;
  name: string;
  email?: string;
  kode_unit?: string;      // Operator only
  officer?: OfficerClaims; // Officer only
  resource_access: {
    "e-notulen": {
      roles: UserRole[];
    };
  };
  exp: number;
  iat: number;
  iss: string;
}

// ── Resolved user context (after JWT parsing) ─────────────────
// This is the shape used throughout the UI, derived from JWT claims.
export interface UserContext {
  // Common
  sub: string;
  role: UserRole;
  displayName: string;   // "Super Admin E-Notulen" | nama OPD | nama pegawai
  preferredUsername?: string;
  email?: string;

  // OPD scope (resolved based on role)
  opdCode?: string;      // undefined for admin (access all), string for operator/officer
  opdName?: string;      // OPD display name

  // Officer-specific
  nip?: string;
  jabatan?: string;
  golongan?: string;
  foto?: string;
  officer?: OfficerClaims;  // full officer data when role === "officer"
}

// ── Auth state shape ──────────────────────────────────────────
export interface AuthState {
  user: UserContext | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ── Auth context actions ──────────────────────────────────────
export interface AuthContextValue extends AuthState {
  /**
   * Switch mock user role (dev-only, only active when NEXT_PUBLIC_USE_MOCK=true)
   */
  switchMockRole?: (role: UserRole) => void;
  logout: () => void;
}

// ── Mock user profiles (one per role, based on PRD spec) ──────
export const MOCK_USERS: Record<UserRole, UserContext> = {
  admin: {
    sub: "mock-admin-uuid-0001",
    role: "admin",
    displayName: "Super Admin E-Notulen",
    email: "admin@purbalinggakab.go.id",
    opdCode: undefined,
    opdName: undefined,
  },
  operator: {
    sub: "mock-operator-uuid-0002",
    role: "operator",
    displayName: "Dinas Komunikasi dan Informatika",
    email: "kominfo@purbalinggakab.go.id",
    opdCode: "T8",
    opdName: "Dinas Komunikasi dan Informatika",
  },
  officer: {
    sub: "mock-officer-uuid-0003",
    role: "officer",
    displayName: "Rafli Firdausy, S.Kom.",
    email: "rafli.firdausy@purbalinggakab.go.id",
    opdCode: "T8",
    opdName: "Dinas Komunikasi dan Informatika",
    nip: "199801012022031001",
    jabatan: "Analis Kebijakan Ahli Muda",
    golongan: "III/b",
    officer: {
      nip: "199801012022031001",
      nama: "RAFLI FIRDAUSY, S.Kom.",
      gelar_belakang: "S.Kom.",
      unit: { id: "T8", nama: "Dinas Komunikasi dan Informatika" },
      jabatan: { nama: "Analis Kebijakan Ahli Muda", jenjang: "Ahli Muda" },
      golongan: "III/b",
    },
  },
};
