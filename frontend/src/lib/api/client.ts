/**
 * api/client.ts — Centralized API Client
 *
 * Helper untuk semua HTTP request ke Backend Go.
 * - Otomatis mengirimkan Cookie access_token sebagai credential.
 * - Otomatis memetakan field name dari Backend (English) ke Frontend (Indonesian).
 * - Penanganan error terpusat sesuai standar ApiErrorResponse.
 */

import { ApiError, HTTP_ERROR_MESSAGES } from "@/types/api";
import type { ApiResponse } from "@/types/api";

const isServer = typeof window === "undefined";

// Server-side (Server Actions / RSC): gunakan hostname internal Docker.
// Client-side (browser): gunakan window.location.origin secara dinamis
// agar URL otomatis menyesuaikan domain yang dibuka (localhost / production HTTPS).
// Tidak perlu rebuild image Docker hanya karena ganti domain!
function getAPIUrl(): string {
  if (isServer) {
    return `http://enotulen-backend:${process.env.APP_PORT || 8080}/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
}

const API_URL = isServer
  ? `http://enotulen-backend:${process.env.APP_PORT || 8080}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1");

// ── Backend → Frontend field mapping ──────────────────────────
// Backend Go menggunakan nama field Bahasa Inggris, sementara
// Frontend TypeScript menggunakan nama field Bahasa Indonesia.
// Fungsi ini mentransformasi response secara otomatis.

type FieldMap = Record<string, string>;

const NOTULEN_FIELD_MAP: FieldMap = {
  title: "judul",
  meeting_date: "tanggal",
  start_time: "waktu_mulai",
  end_time: "waktu_selesai",
  location: "tempat",
  led_by: "dipimpin_nama",
  led_by_position: "dipimpin_jabatan",
  led_by_nip: "dipimpin_nip",
  signed_by: "pimpinan_nama",
  signed_by_position: "pimpinan_jabatan",
  signed_by_nip: "pimpinan_nip",
  notulist_name: "notulis_nama",
  notulist_position: "notulis_jabatan",
  notulist_nip: "notulis_nip",
  opd_code: "opd_code",
  opd_name: "opd_name",
  input_type: "input_type",
  file_url: "file_url",
  file_name: "file_name",
  created_by_sub: "created_by_sub",
  created_by_name: "created_by_name",
  attendee_count: "attendee_count",
  attachment_count: "attachment_count",
};

const ATTENDEE_FIELD_MAP: FieldMap = {
  name: "nama",
  institution: "instansi",
  position: "jabatan",
  sort_order: "urutan",
  notulen_id: "notulen_id",
};

const ATTACHMENT_FIELD_MAP: FieldMap = {
  file_name: "filename",
  file_url: "url",
  file_size: "size_bytes",
  mime_type: "mime_type",
  sort_order: "urutan",
  notulen_id: "notulen_id",
};

/**
 * Recursively maps backend field names to frontend field names.
 */
function mapFields<T>(data: unknown, fieldMap: FieldMap): T {
  if (data === null || data === undefined) return data as T;
  if (Array.isArray(data)) {
    return data.map((item) => mapFields(item, fieldMap)) as T;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const newKey = fieldMap[key] ?? key;

      // Recursively map nested attendees and attachments
      if (key === "attendees" && Array.isArray(value)) {
        mapped[newKey] = value.map((a) => mapFields(a, ATTENDEE_FIELD_MAP));
      } else if (key === "attachments" && Array.isArray(value)) {
        mapped[newKey] = value.map((a) => mapFields(a, ATTACHMENT_FIELD_MAP));
      } else {
        mapped[newKey] = value;
      }
    }
    return mapped as T;
  }
  return data as T;
}

/**
 * Maps a single Notulen backend response to frontend type.
 */
export function mapNotulenResponse<T>(data: unknown): T {
  return mapFields<T>(data, NOTULEN_FIELD_MAP);
}

/**
 * Maps frontend field names back to backend field names for request payloads.
 */
const NOTULEN_REVERSE_MAP: FieldMap = Object.fromEntries(
  Object.entries(NOTULEN_FIELD_MAP).map(([k, v]) => [v, k])
);

const ATTENDEE_REVERSE_MAP: FieldMap = Object.fromEntries(
  Object.entries(ATTENDEE_FIELD_MAP).map(([k, v]) => [v, k])
);

export function mapNotulenRequest(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const newKey = NOTULEN_REVERSE_MAP[key] ?? key;

    if (key === "attendees" && Array.isArray(value)) {
      mapped[newKey] = value.map((a: Record<string, unknown>) => {
        const ma: Record<string, unknown> = {};
        for (const [ak, av] of Object.entries(a)) {
          ma[ATTENDEE_REVERSE_MAP[ak] ?? ak] = av;
        }
        return ma;
      });
    } else {
      mapped[newKey] = value;
    }
  }
  return mapped;
}

// ── Core fetch wrapper ────────────────────────────────────────

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  // Only set Content-Type for JSON bodies (not FormData)
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (isServer) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("access_token")?.value;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const allCookies = cookieStore.getAll();
      const cookieString = allCookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join("; ");
      if (cookieString) {
        headers["Cookie"] = cookieString;
      }
    } catch (e) {
      // Ignore if next/headers is not available
    }
  }

  const url = endpoint.startsWith("http") ? endpoint : `${getAPIUrl()}${endpoint}`;

  const res = await fetch(url, {
    credentials: "include",
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    let errorMessage = HTTP_ERROR_MESSAGES[res.status] ?? "Terjadi kesalahan.";
    let errorCode = "UNKNOWN_ERROR";

    try {
      const errorJson = await res.json();
      if (errorJson.message) errorMessage = errorJson.message;
      if (errorJson.error_code) errorCode = errorJson.error_code;
    } catch {
      // Response is not JSON, use default message
    }

    throw new ApiError(res.status, errorCode, errorMessage);
  }

  return res.json();
}

export { API_URL, getAPIUrl };
