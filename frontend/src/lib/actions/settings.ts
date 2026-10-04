"use server";

/**
 * actions/settings.ts — Server Actions for OPD Settings (Kop Surat)
 * Source: PRD Bagian VI.7 — OPD Settings Module
 */

import type { OpdSettings, OpdSettingsInput } from "@/types/notulen";
import type { OpdData } from "@/types/api";
import { sleep } from "@/lib/utils";
import { mockOpdSettings, mockOpdList } from "@/lib/data/settings";
import { apiClient } from "@/lib/api/client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ── Get OPD settings (kop surat) for one OPD ─────────────────
export async function getOpdSettings(opdCode: string): Promise<OpdSettings | null> {
  if (USE_MOCK) {
    await sleep(300);
    const res = mockOpdSettings[opdCode] ?? null;
    return res ? JSON.parse(JSON.stringify(res)) : null;
  }

  try {
    const json = await apiClient<any>(`/opd/${opdCode}/settings`);
    const data = json.data;
    if (!data) return null;

    return {
      id: data.id || opdCode,
      opd_code: data.opd_code || data.kode_unit || opdCode,
      opd_name: data.opd_name || "",
      logo_url: data.logo_url || "",
      alamat: data.alamat || data.address || "",
      telepon: data.telepon || data.phone || "",
      fax: data.fax || "",
      email: data.email || "",
      kode_pos: data.kode_pos || "",
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("Failed to fetch OPD settings:", err);
    return null;
  }
}

// ── Update OPD settings ───────────────────────────────────────
export async function updateOpdSettings(
  opdCode: string,
  input: OpdSettingsInput,
): Promise<OpdSettings> {
  if (USE_MOCK) {
    await sleep(500);
    const existing = mockOpdSettings[opdCode];
    if (!existing) throw new Error("Pengaturan OPD tidak ditemukan");
    const updated: OpdSettings = {
      ...existing,
      ...input,
      logo_url: existing.logo_url, // logo handled separately via upload
      updated_at: new Date().toISOString(),
    };
    mockOpdSettings[opdCode] = updated;
    return JSON.parse(JSON.stringify(updated));
  }

  const payload = {
    opd_name: input.opd_name || "",
    address: input.alamat || "",
    phone: input.telepon || "",
    email: input.email || "",
    fax: input.fax || "",
    kode_pos: input.kode_pos || "",
  };

  const json = await apiClient<any>(`/opd/${opdCode}/settings`, {
    method: "PUT",
    body: payload,
  });

  const data = json.data || {};
  return {
    id: data.id || opdCode,
    opd_code: data.opd_code || data.kode_unit || opdCode,
    opd_name: data.opd_name || "",
    logo_url: data.logo_url || "",
    alamat: data.alamat || data.address || "",
    telepon: data.telepon || data.phone || "",
    fax: data.fax || "",
    email: data.email || "",
    kode_pos: data.kode_pos || "",
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

// ── Get OPD list (from API SKPD proxy on backend) ─────────────
export async function getOpdList(): Promise<OpdData[]> {
  if (USE_MOCK) {
    await sleep(200);
    return JSON.parse(JSON.stringify(mockOpdList));
  }

  try {
    const json = await apiClient<any[]>(`/opd`);
    const data = json.data || [];
    return data.map((item) => ({
      kode_unit: item.value || item.kode_unit || item.id,
      nama: item.label || item.nama,
    }));
  } catch (err) {
    console.error("Failed to fetch OPD list:", err);
    return [];
  }
}
