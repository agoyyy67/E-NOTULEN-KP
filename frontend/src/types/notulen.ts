/**
 * notulen.ts — TypeScript types for core Notulen domain entities
 * Source: PRD Bagian VI — Feature Specifications & database schema
 */

// ── Notulen status (state machine) ───────────────────────────
export type NotulenStatus = "draft" | "final" | "deleted";

// ── Input type: editor (Tiptap) or file upload ────────────────
export type NotulenInputType = "editor" | "upload";

// ── Attendee (daftar hadir) — strictly 3 columns per PRD VI.3 ─
export interface Attendee {
  id: string;
  notulen_id: string;
  nama: string;
  instansi?: string;
  jabatan?: string;
  urutan: number; // for drag-and-drop reorder
}

export type AttendeeInput = Pick<Attendee, "nama" | "instansi" | "jabatan">;

// ── Attachment (foto dokumentasi) ────────────────────────────
export interface Attachment {
  id: string;
  notulen_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;         // presigned URL from MinIO
  urutan: number;
  created_at: string;
}

// ── Auto-save snapshot ────────────────────────────────────────
export interface AutoSaveSnapshot {
  id: string;
  notulen_id: string;
  content: Record<string, unknown>; // Tiptap JSON document
  saved_by_sub: string;
  saved_by_name: string;
  created_at: string;
}

// ── Main Notulen entity ───────────────────────────────────────
export interface Notulen {
  id: string;
  judul: string;                   // Meeting title
  tanggal: string;                 // Date (ISO 8601)
  waktu_mulai: string;             // "08:00"
  waktu_selesai: string;           // "10:00"
  tempat: string;                  // Venue/location
  dipimpin_nama: string;           // Meeting leader name
  dipimpin_jabatan?: string;       // Meeting leader position
  dipimpin_nip?: string;           // Meeting leader NIP (if pegawai)
  pimpinan_nama?: string;          // Signing official name (Penanda Tangan)
  pimpinan_jabatan?: string;      // Signing official position
  pimpinan_nip?: string;          // Signing official NIP
  notulis_nama: string;            // Note-taker name
  notulis_jabatan?: string;        // Note-taker position
  notulis_nip?: string;            // Note-taker NIP (if pegawai)
  opd_code: string;                // OPD identifier (from API SKPD / JWT)
  opd_name?: string;               // OPD name (denormalized for display)
  input_type: NotulenInputType;
  content?: Record<string, unknown>; // Tiptap JSON (for editor type)
  file_url?: string;               // MinIO URL (for upload type)
  file_name?: string;
  status: NotulenStatus;
  created_by_sub: string;          // Keycloak UUID
  created_by_name: string;
  attendees?: Attendee[];
  attachments?: Attachment[];
  opd_settings?: OpdSettings;
  attendee_count?: number;
  attachment_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ── List item (lighter shape for list view) ──────────────────
export interface NotulenListItem
  extends Pick<
    Notulen,
    | "id"
    | "judul"
    | "tanggal"
    | "waktu_mulai"
    | "waktu_selesai"
    | "tempat"
    | "dipimpin_nama"
    | "notulis_nama"
    | "opd_code"
    | "opd_name"
    | "status"
    | "input_type"
    | "created_by_name"
    | "attendee_count"
    | "attachment_count"
    | "created_at"
    | "updated_at"
  > {}

// ── Form input types ─────────────────────────────────────────
export interface CreateNotulenInput {
  judul: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  tempat: string;
  dipimpin_nama: string;
  dipimpin_jabatan?: string;
  dipimpin_nip?: string;
  pimpinan_nama?: string;
  pimpinan_jabatan?: string;
  pimpinan_nip?: string;
  notulis_nama: string;
  notulis_jabatan?: string;
  notulis_nip?: string;
  opd_code: string;
  opd_name?: string;
  input_type: NotulenInputType;
  content?: Record<string, unknown>;
  file_name?: string;
  file_url?: string;
  attendees?: Attendee[];
  attachments?: Attachment[];
}

export type UpdateNotulenInput = Partial<CreateNotulenInput> & {
  status?: NotulenStatus;
};

// ── Search & filter parameters ────────────────────────────────
export interface NotulenFilterParams {
  search?: string;
  status?: NotulenStatus | "all";
  opd_code?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: "tanggal" | "judul" | "created_at";
  sort_dir?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

// ── OPD Settings (kop surat) — PRD VI.7 ─────────────────────
export interface OpdSettings {
  id: string;
  opd_code: string;
  opd_name: string;
  logo_url?: string;        // presigned URL from MinIO
  alamat?: string;
  telepon?: string;
  fax?: string;
  email?: string;
  kode_pos?: string;
  created_at: string;
  updated_at: string;
}

export interface OpdSettingsInput {
  opd_name?: string;
  alamat?: string;
  telepon?: string;
  fax?: string;
  email?: string;
  kode_pos?: string;
  logo?: File; // handled separately as multipart
}

// ── Dashboard statistics ──────────────────────────────────────
export interface DashboardStats {
  total_notulen: number;
  bulan_ini: number;
  draft_count: number;
  final_count: number;
  chart_monthly: MonthlyChartData[];
  chart_per_opd?: OpdChartData[];  // Admin only
  recent_notulen: NotulenListItem[];
}

export interface MonthlyChartData {
  bulan: string;    // "Jan", "Feb", etc.
  total: number;
  draft: number;
  final: number;
}

export interface OpdChartData {
  opd_name: string;
  total: number;
}

// ── Report types ──────────────────────────────────────────────
export interface ReportSummary {
  total_notulen: number;
  total_final: number;
  total_draft: number;
  total_peserta: number;
  rata_peserta: number;
}

export interface ReportActivity {
  id: string;
  judul: string;
  tanggal: string;
  opd_name: string;
  peserta_count: number;
  status: NotulenStatus;
}
