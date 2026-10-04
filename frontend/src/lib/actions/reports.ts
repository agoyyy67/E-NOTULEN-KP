"use server";

/**
 * actions/reports.ts — Server Actions for Rekap & Laporan module
 * Source: PRD Bagian VI.8 — Rekap Laporan
 */

import type { ReportSummary, ReportActivity } from "@/types/notulen";
import { sleep } from "@/lib/utils";
import { mockReportSummary, mockReportActivities } from "@/lib/data/reports";
import { apiClient, API_URL } from "@/lib/api/client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export interface ReportFilterParams {
  date_from?: string;
  date_to?: string;
  opd_code?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export async function getReportSummary(
  params: ReportFilterParams = {},
): Promise<ReportSummary> {
  if (USE_MOCK) {
    await sleep(300);
    return mockReportSummary;
  }

  const searchParams = new URLSearchParams();
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to)   searchParams.set("date_to", params.date_to);
  if (params.opd_code)  searchParams.set("opd_code", params.opd_code);

  const queryString = searchParams.toString();
  const endpoint = `/reports/summary${queryString ? `?${queryString}` : ""}`;

  try {
    const json = await apiClient<any>(endpoint);
    const data = json.data || {};
    return {
      total_notulen: data.total_notulen ?? data.total ?? 0,
      total_final: data.total_final ?? data.final_count ?? 0,
      total_draft: data.total_draft ?? data.draft_count ?? 0,
      total_peserta: data.total_peserta ?? 0,
      rata_peserta: data.rata_peserta ?? 0,
    };
  } catch (err) {
    console.error("Failed to fetch report summary:", err);
    return {
      total_notulen: 0,
      total_final: 0,
      total_draft: 0,
      total_peserta: 0,
      rata_peserta: 0,
    };
  }
}

export async function getReportActivities(
  params: ReportFilterParams = {},
): Promise<{ items: ReportActivity[]; meta: any }> {
  if (USE_MOCK) {
    await sleep(400);
    let list = [...mockReportActivities];

    if (params.status && params.status !== "all") {
      list = list.filter((r) => r.status === params.status);
    }
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const start = (page - 1) * perPage;
    const paginatedList = list.slice(start, start + perPage);
    
    return {
      items: paginatedList,
      meta: {
        total: list.length,
        total_pages: Math.ceil(list.length / perPage),
        current_page: page,
        per_page: perPage,
      },
    };
  }

  const searchParams = new URLSearchParams();
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to)   searchParams.set("date_to", params.date_to);
  if (params.opd_code)  searchParams.set("opd_code", params.opd_code);
  if (params.status && params.status !== "all") searchParams.set("status", params.status);
  
  const page = params.page || 1;
  const perPage = params.per_page || 10;
  searchParams.set("page", page.toString());
  searchParams.set("limit", perPage.toString());

  const queryString = searchParams.toString();

  try {
    const json = await apiClient<any>(`/reports/activities?${queryString}`);
    const rawItems = Array.isArray(json.data) ? json.data : [];
    const meta = json.meta || { total: rawItems.length, total_pages: 1, current_page: page, per_page: perPage };
    
    const items = rawItems.map((item: any) => ({
      id: item.id || "",
      judul: item.title || item.judul || "",
      tanggal: item.meeting_date || item.tanggal || "",
      opd_name: item.opd_name || "",
      peserta_count: item.attendee_count ?? item.peserta_count ?? 0,
      status: item.status || "draft",
    }));
    return { items, meta };
  } catch {
    try {
      const json = await apiClient<any>(`/notulen?${queryString}`);
      const rawItems = Array.isArray(json.data) ? json.data : [];
      const meta = json.meta || { total: rawItems.length, total_pages: 1, current_page: page, per_page: perPage };

      const items = rawItems.map((item: any) => ({
        id: item.id || "",
        judul: item.title || item.judul || "",
        tanggal: item.meeting_date || item.tanggal || "",
        opd_name: item.opd_name || "",
        peserta_count: item.attendee_count ?? item.peserta_count ?? 0,
        status: item.status || "draft",
      }));
      return { items, meta };
    } catch (err) {
      console.error("Failed to fetch report activities:", err);
      return { items: [], meta: { total: 0, total_pages: 1, current_page: page, per_page: perPage } };
    }
  }
}

// ── Export PDF report ─────────────────────────────────────────
export async function exportReportPdf(
  params: ReportFilterParams = {},
): Promise<Blob> {
  if (USE_MOCK) {
    await sleep(600);
    return new Blob(["Mock PDF Report"], { type: "application/pdf" });
  }

  const searchParams = new URLSearchParams();
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to)   searchParams.set("date_to", params.date_to);
  if (params.opd_code)  searchParams.set("opd_code", params.opd_code);

  const queryString = searchParams.toString();

  const headers: Record<string, string> = {};
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("access_token")?.value;
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const cookieString = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
      if (cookieString) headers["Cookie"] = cookieString;
    } catch {}
  }

  const res = await fetch(`${API_URL}/reports/export?${queryString}`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Gagal mengekspor laporan PDF");
  return res.blob();
}
