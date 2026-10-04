/**
 * api.ts — Standard API response envelope types
 * Source: CLAUDE.md — API Response Format
 *
 * Backend Go returns consistent JSON envelope for all endpoints.
 */

// ── Standard success response ─────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

// ── Standard error response ───────────────────────────────────
export interface ApiErrorResponse {
  success: false;
  message: string;
  error_code: string;
  errors?: ValidationError[];
}

// ── Pagination metadata ───────────────────────────────────────
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ── Field-level validation error ─────────────────────────────
export interface ValidationError {
  field: string;
  message: string;
}

// ── Paginated list result ─────────────────────────────────────
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// ── OPD data (from API SKPD via backend proxy) ───────────────
export interface OpdData {
  kode_unit: string;
  nama: string;
  singkatan?: string;
}

// ── API error class for client-side handling ──────────────────
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly errors?: ValidationError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── HTTP error codes mapping to UI behavior ───────────────────
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: "Permintaan tidak valid.",
  401: "Sesi Anda telah berakhir. Silakan masuk kembali.",
  403: "Anda tidak memiliki izin untuk mengakses halaman ini.",
  404: "Data yang Anda cari tidak ditemukan.",
  422: "Data yang Anda masukkan tidak valid.",
  500: "Terjadi kesalahan pada server. Coba lagi nanti.",
};
