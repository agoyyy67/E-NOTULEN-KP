"use server";

/**
 * actions/notulen.ts — Server Actions for Notulen module
 *
 * These functions call the Go backend API.
 * In MOCK mode, they use the local mock data stores.
 * In PRODUCTION mode, they call the Go backend via apiClient with
 * automatic field name mapping (Backend English ↔ Frontend Indonesian).
 */

import type {
  Notulen,
  NotulenListItem,
  CreateNotulenInput,
  UpdateNotulenInput,
  NotulenFilterParams,
  DashboardStats,
} from "@/types/notulen";
import type { PaginatedResult } from "@/types/api";
import { sleep } from "@/lib/utils";
import {
  mockNotulenList,
  mockNotulen,
  mockAttendees,
  mockDashboardStats,
} from "@/lib/data/notulen";
import {
  apiClient,
  mapNotulenResponse,
  mapNotulenRequest,
  API_URL,
} from "@/lib/api/client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ── List notulen ──────────────────────────────────────────────
export async function getNotulenList(
  params: NotulenFilterParams = {},
): Promise<PaginatedResult<NotulenListItem>> {
  if (USE_MOCK) {
    await sleep(300);

    let items = [...mockNotulenList];

    // Apply search filter
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter((n) =>
        n.judul.toLowerCase().includes(q) ||
        n.tempat.toLowerCase().includes(q),
      );
    }

    // Apply status filter
    if (params.status && params.status !== "all") {
      items = items.filter((n) => n.status === params.status);
    }

    // Apply OPD filter
    if (params.opd_code) {
      items = items.filter((n) => n.opd_code === params.opd_code);
    }

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 10;
    const total = items.length;
    const sliced = items.slice((page - 1) * perPage, page * perPage);

    return {
      items: JSON.parse(JSON.stringify(sliced)),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  // ── Production: Call Backend Go API via apiClient ────────────
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("q", params.search);
  if (params.status && params.status !== "all") searchParams.set("status", params.status);
  if (params.opd_code) searchParams.set("opd_code", params.opd_code);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_dir) searchParams.set("sort_order", params.sort_dir);

  const queryString = searchParams.toString();
  const endpoint = `/notulen${queryString ? `?${queryString}` : ""}`;

  const json = await apiClient<unknown[]>(endpoint);

  // Map backend fields to frontend fields
  const rawItems = Array.isArray(json.data) ? json.data : [];
  const mappedItems = rawItems.map((item: unknown) =>
    mapNotulenResponse<NotulenListItem>(item),
  );

  return {
    items: mappedItems,
    meta: json.meta || { page: 1, per_page: 10, total: 0, total_pages: 0 },
  };
}

// ── Get notulen detail ────────────────────────────────────────
export async function getNotulenById(id: string): Promise<Notulen | null> {
  if (USE_MOCK) {
    await sleep(200);
    if (mockNotulen[id]) return JSON.parse(JSON.stringify(mockNotulen[id]));
    const listItem = mockNotulenList.find((n) => n.id === id);
    if (listItem) {
      const fallback: Notulen = {
        ...listItem,
        dipimpin_jabatan: "Kepala Instansi",
        notulis_jabatan: "Analis Kebijakan",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: `Isi risalah untuk ${listItem.judul}` }],
            },
          ],
        },
        created_by_sub: "mock-uuid",
        attendees: mockAttendees[id] || [],
        attachments: [],
      };
      mockNotulen[id] = fallback;
      return JSON.parse(JSON.stringify(fallback));
    }
    return null;
  }

  // ── Production ─────────────────────────────────────────────
  const json = await apiClient<unknown>(`/notulen/${id}`);
  if (!json.data) return null;
  return mapNotulenResponse<Notulen>(json.data);
}

// ── Create notulen ────────────────────────────────────────────
export async function createNotulen(input: CreateNotulenInput): Promise<Notulen> {
  if (USE_MOCK) {
    await sleep(500);
    const newId = `notulen-mock-${Date.now()}`;
    const now = new Date().toISOString();
    const created: Notulen = {
      id: newId,
      ...input,
      status: "draft",
      created_by_sub: "mock-uuid",
      created_by_name: input.notulis_nama || "Mock User",
      attendees: input.attendees || [],
      attachments: input.attachments || [],
      attendee_count: input.attendees?.length || 0,
      attachment_count: input.attachments?.length || 0,
      created_at: now,
      updated_at: now,
    };
    mockNotulen[newId] = created;

    // Tambahkan notulen baru ke daftar mock (mockNotulenList) agar muncul di tabel /notulen
    mockNotulenList.unshift({
      id: created.id,
      judul: created.judul,
      tanggal: created.tanggal,
      waktu_mulai: created.waktu_mulai,
      waktu_selesai: created.waktu_selesai,
      tempat: created.tempat,
      dipimpin_nama: created.dipimpin_nama || "—",
      notulis_nama: created.notulis_nama,
      opd_code: created.opd_code,
      opd_name: created.opd_name || "Dinas Komunikasi dan Informatika",
      status: created.status,
      input_type: created.input_type,
      created_by_name: created.created_by_name,
      attendee_count: created.attendee_count,
      attachment_count: created.attachment_count,
      created_at: created.created_at,
      updated_at: created.updated_at,
    });

    return JSON.parse(JSON.stringify(created));
  }

  // ── Production: Map frontend fields → backend fields ───────
  try {
    const payload = mapNotulenRequest(input as unknown as Record<string, unknown>);
    const json = await apiClient<unknown>("/notulen", {
      method: "POST",
      body: payload,
    });
    return mapNotulenResponse<Notulen>(json.data);
  } catch (err: any) {
    console.error("[createNotulen error]:", err);
    throw new Error(err?.message || "Gagal membuat notulen di server");
  }
}

// ── Update notulen ────────────────────────────────────────────
export async function updateNotulen(
  id: string,
  input: UpdateNotulenInput,
): Promise<Notulen> {
  if (USE_MOCK) {
    await sleep(300);
    let existing = mockNotulen[id];
    if (!existing) {
      const listItem = mockNotulenList.find((n) => n.id === id);
      existing = {
        id,
        judul: listItem?.judul || "Notulen Rapat",
        tanggal: listItem?.tanggal || new Date().toISOString().split("T")[0],
        waktu_mulai: listItem?.waktu_mulai || "09:00",
        waktu_selesai: listItem?.waktu_selesai || "11:00",
        tempat: listItem?.tempat || "Ruang Rapat",
        dipimpin_nama: listItem?.dipimpin_nama || "Pimpinan Rapat",
        notulis_nama: listItem?.notulis_nama || "Notulis Rapat",
        opd_code: listItem?.opd_code || "T8",
        opd_name: listItem?.opd_name || "Dinas Komunikasi dan Informatika",
        input_type: "editor",
        status: "draft",
        created_by_sub: "mock-uuid",
        created_by_name: "Mock User",
        attendees: mockAttendees[id] || [],
        attachments: [],
        attendee_count: 0,
        attachment_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockNotulen[id] = existing;
    }
    const updated = {
      ...existing,
      ...input,
      attendee_count: input.attendees ? input.attendees.length : existing.attendee_count,
      attachment_count: input.attachments ? input.attachments.length : existing.attachment_count,
      updated_at: new Date().toISOString()
    };
    mockNotulen[id] = updated;

    // Update item yang bersangkutan di mockNotulenList agar tabel ter-update
    const idx = mockNotulenList.findIndex((item) => item.id === id);
    if (idx !== -1) {
      mockNotulenList[idx] = {
        ...mockNotulenList[idx],
        judul: updated.judul ?? mockNotulenList[idx].judul,
        tanggal: updated.tanggal ?? mockNotulenList[idx].tanggal,
        waktu_mulai: updated.waktu_mulai ?? mockNotulenList[idx].waktu_mulai,
        waktu_selesai: updated.waktu_selesai ?? mockNotulenList[idx].waktu_selesai,
        tempat: updated.tempat ?? mockNotulenList[idx].tempat,
        dipimpin_nama: updated.dipimpin_nama ?? mockNotulenList[idx].dipimpin_nama,
        notulis_nama: updated.notulis_nama ?? mockNotulenList[idx].notulis_nama,
        opd_code: updated.opd_code ?? mockNotulenList[idx].opd_code,
        opd_name: updated.opd_name ?? mockNotulenList[idx].opd_name,
        status: updated.status ?? mockNotulenList[idx].status,
        attendee_count: updated.attendee_count ?? mockNotulenList[idx].attendee_count,
        attachment_count: updated.attachment_count ?? mockNotulenList[idx].attachment_count,
        updated_at: updated.updated_at,
      };
    }

    return JSON.parse(JSON.stringify(updated));
  }

  // ── Production ─────────────────────────────────────────────
  try {
    const payload = mapNotulenRequest(input as unknown as Record<string, unknown>);
    const json = await apiClient<unknown>(`/notulen/${id}`, {
      method: "PATCH",
      body: payload,
    });
    return mapNotulenResponse<Notulen>(json.data);
  } catch (err: any) {
    console.error(`[updateNotulen error for ${id}]:`, err);
    throw new Error(err?.message || "Gagal memperbarui data notulen ke server");
  }
}

// ── Auto-save content ─────────────────────────────────────────
export async function autoSaveNotulen(
  id: string,
  content: Record<string, unknown>,
): Promise<void> {
  if (USE_MOCK) {
    await sleep(200);
    if (mockNotulen[id]) {
      mockNotulen[id].content = content;
      mockNotulen[id].updated_at = new Date().toISOString();
    }
    return;
  }

  // ── Production ─────────────────────────────────────────────
  await apiClient(`/notulen/${id}/auto-save`, {
    method: "POST",
    body: { content },
  });
}

// ── Soft delete / trash ───────────────────────────────────────
export async function deleteNotulen(id: string): Promise<void> {
  if (USE_MOCK) {
    await sleep(300);
    if (mockNotulen[id]) {
      mockNotulen[id].status = "deleted";
      mockNotulen[id].deleted_at = new Date().toISOString();
    }
    const idx = mockNotulenList.findIndex((item) => item.id === id);
    if (idx !== -1) {
      mockNotulenList[idx].status = "deleted";
    }
    return;
  }

  // ── Production ─────────────────────────────────────────────
  await apiClient(`/notulen/${id}`, { method: "DELETE" });
}

// ── Restore notulen from trash ────────────────────────────────
export async function restoreNotulen(id: string): Promise<Notulen> {
  if (USE_MOCK) {
    await sleep(300);
    if (mockNotulen[id]) {
      mockNotulen[id].status = "draft";
      mockNotulen[id].deleted_at = undefined;
    }
    const idx = mockNotulenList.findIndex((item) => item.id === id);
    if (idx !== -1) {
      mockNotulenList[idx].status = "draft";
    }
    return mockNotulen[id] || ({} as Notulen);
  }

  // ── Production ─────────────────────────────────────────────
  const json = await apiClient<unknown>(`/notulen/${id}/restore`, {
    method: "POST",
  });
  return mapNotulenResponse<Notulen>(json.data);
}

// ── Duplicate notulen ─────────────────────────────────────────
export async function duplicateNotulen(id: string): Promise<Notulen> {
  if (USE_MOCK) {
    await sleep(400);
    const source = mockNotulen[id];
    if (!source) throw new Error("Notulen sumber tidak ditemukan");
    const newId = `notulen-mock-${Date.now()}`;
    const now = new Date().toISOString();
    const duplicate: Notulen = {
      ...source,
      id: newId,
      judul: `Salinan — ${source.judul}`,
      status: "draft",
      attendees: [],
      attachments: [],
      attendee_count: 0,
      attachment_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    };
    mockNotulen[newId] = duplicate;

    // Push duplicate into mockNotulenList
    mockNotulenList.unshift({
      id: duplicate.id,
      judul: duplicate.judul,
      tanggal: duplicate.tanggal,
      waktu_mulai: duplicate.waktu_mulai,
      waktu_selesai: duplicate.waktu_selesai,
      tempat: duplicate.tempat,
      dipimpin_nama: duplicate.dipimpin_nama || "—",
      notulis_nama: duplicate.notulis_nama,
      opd_code: duplicate.opd_code,
      opd_name: duplicate.opd_name,
      status: "draft",
      input_type: duplicate.input_type,
      created_by_name: duplicate.created_by_name,
      attendee_count: 0,
      attachment_count: 0,
      created_at: now,
      updated_at: now,
    });

    return duplicate;
  }

  // ── Production ─────────────────────────────────────────────
  const json = await apiClient<unknown>(`/notulen/${id}/duplicate`, {
    method: "POST",
  });
  return mapNotulenResponse<Notulen>(json.data);
}

// ── Dashboard stats ───────────────────────────────────────────
export async function getDashboardStats(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<DashboardStats> {
  if (USE_MOCK) {
    await sleep(400);
    return mockDashboardStats;
  }

  const searchParams = new URLSearchParams();
  if (params?.date_from) searchParams.set("date_from", params.date_from);
  if (params?.date_to) searchParams.set("date_to", params.date_to);
  const qStr = searchParams.toString();

  // ── Production: Backend returns DashboardSummary shape ─────
  const json = await apiClient<Record<string, unknown>>(
    `/dashboard/stats${qStr ? `?${qStr}` : ""}`,
  );
  const raw = json.data;

  // Map backend DashboardSummary → frontend DashboardStats
  const stats: DashboardStats = {
    total_notulen: (raw.total_notulen as number) ?? 0,
    bulan_ini: (raw.total_notulen_bulan_ini as number) ?? 0,
    draft_count: (raw.total_draft as number) ?? 0,
    final_count: (raw.total_final as number) ?? 0,
    chart_monthly: Array.isArray(raw.monthly_stats)
      ? raw.monthly_stats.map((m: any) => ({
          bulan: m.month,
          total: m.total,
          draft: m.draft,
          final: m.final,
        }))
      : [],
    chart_per_opd: Array.isArray(raw.opd_rankings)
      ? raw.opd_rankings.map((o: any) => ({
          opd_name: o.opd_name,
          total: o.count,
        }))
      : [],
    recent_notulen: [],
  };

  // Map recent_activities (backend) → recent_notulen (frontend)
  if (raw.recent_activities && Array.isArray(raw.recent_activities)) {
    stats.recent_notulen = (raw.recent_activities as unknown[]).map((item) =>
      mapNotulenResponse<NotulenListItem>(item),
    );
  }

  return stats;
}

// ── Download PDF ──────────────────────────────────────────────
export async function downloadNotulenPdf(id: string): Promise<Blob> {
  if (USE_MOCK) {
    await sleep(600);
    // Return a mock empty PDF blob
    return new Blob(["Mock PDF content"], { type: "application/pdf" });
  }

  // ── Production ─────────────────────────────────────────────
  const headers: Record<string, string> = {};
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("access_token")?.value;
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const cookieString = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
      if (cookieString) headers["Cookie"] = cookieString;
    } catch { }
  }

  const res = await fetch(`${API_URL}/notulen/${id}/download`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to download PDF: ${res.status}`);
  return res.blob();
}

// ── Generate Presigned Upload URL ─────────────────────────────
export async function getPresignedUploadUrl(
  notulenId: string,
  fileName: string,
  fileType: string,
): Promise<{ upload_url: string; object_name: string }> {
  if (USE_MOCK) {
    await sleep(200);
    return {
      upload_url: `https://placehold.co/mock-upload-url`,
      object_name: `notulen/${notulenId}/attachments/${fileName}`,
    };
  }

  // ── Production ─────────────────────────────────────────────
  const json = await apiClient<{ upload_url: string; object_name: string }>(
    `/notulen/${notulenId}/presigned-upload`,
    {
      method: "POST",
      body: { file_name: fileName, file_type: fileType },
    },
  );
  return json.data;
}

