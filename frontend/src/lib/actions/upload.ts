"use server";

/**
 * actions/upload.ts — File upload actions
 * Source: PRD Bagian VI.5 — Dokumentasi Foto & VIII.2 — Batasan Upload
 *
 * File validation is done both client-side (UX) and server-side (security).
 * Actual storage is in MinIO via the Go backend.
 */

import type { Attachment } from "@/types/notulen";
import { sleep, generateId } from "@/lib/utils";
import { apiClient, API_URL } from "@/lib/api/client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ── Upload attachment (foto dokumentasi) ──────────────────────
export async function uploadAttachment(
  notulenId: string,
  file: FormData,
): Promise<Attachment> {
  if (USE_MOCK) {
    await sleep(800);
    const now = new Date().toISOString();
    const mockAttachment: Attachment = {
      id: generateId(),
      notulen_id: notulenId,
      filename: "foto-dokumentasi.jpg",
      mime_type: "image/jpeg",
      size_bytes: 1024 * 512, // 512 KB
      url: `https://placehold.co/1200x800/10B981/FFFFFF?text=Foto+Dokumentasi`,
      urutan: 1,
      created_at: now,
    };
    return mockAttachment;
  }

  // ── Production: Upload via FormData ────────────────────────
  const json = await apiClient<any>(`/notulen/${notulenId}/attachments`, {
    method: "POST",
    body: file,
  });

  const data = json.data;
  return {
    id: data.id,
    notulen_id: data.notulen_id,
    filename: data.file_name ?? data.filename,
    mime_type: data.mime_type,
    size_bytes: data.file_size ?? data.size_bytes,
    url: data.file_url ?? data.url,
    urutan: data.sort_order ?? data.urutan ?? 0,
    created_at: data.created_at,
  };
}

// ── Delete attachment ─────────────────────────────────────────
export async function deleteAttachment(
  notulenId: string,
  attachmentId: string,
): Promise<void> {
  if (USE_MOCK) {
    await sleep(300);
    return; // Mock: no actual storage to clean up
  }

  // ── Production ─────────────────────────────────────────────
  await apiClient(`/notulen/${notulenId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

// ── Upload OPD logo ───────────────────────────────────────────
export async function uploadOpdLogo(
  opdCode: string,
  file: FormData,
): Promise<string> {
  if (USE_MOCK) {
    await sleep(600);
    return `https://placehold.co/200x200/064E3B/FFFFFF?text=${opdCode}`;
  }

  // ── Production ─────────────────────────────────────────────
  const json = await apiClient<any>(`/opd/${opdCode}/logo`, {
    method: "POST",
    body: file,
  });
  return json.data.logo_url;
}

// ── Upload Main Notulen Document (PDF/Word) ───────────────────
export async function uploadNotulenDocument(
  notulenId: string,
  formData: FormData,
): Promise<{ file_name: string; file_url: string }> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("File tidak ditemukan");

  if (USE_MOCK) {
    await sleep(1000);
    return {
      file_name: file.name,
      file_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    };
  }

  // Production: Stream file directly via backend API proxy (bypasses port 9000 CORS)
  const json = await apiClient<any>(`/notulen/${notulenId}/upload-doc`, {
    method: "POST",
    body: formData,
  });

  return {
    file_name: json.data.file_name,
    file_url: json.data.file_url,
  };
}
