/**
 * data/settings.ts — Mock data for OPD Settings (kop surat)
 * Source: PRD Bagian VI.7 — OPD Settings field specification
 */

import type { OpdSettings } from "@/types/notulen";

export const mockOpdSettings: Record<string, OpdSettings> = {
  T8: {
    id: "opd-settings-001",
    opd_code: "T8",
    opd_name: "Dinas Komunikasi dan Informatika",
    logo_url: undefined,
    alamat: "Jl. Let. Jend. S. Parman No. 8, Purbalingga, Jawa Tengah 53316",
    telepon: "(0281) 891074",
    fax: "(0281) 893192",
    email: "diskominfo@purbalinggakab.go.id",
    kode_pos: "53316",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-15T08:00:00Z",
  },
  A1: {
    id: "opd-settings-002",
    opd_code: "A1",
    opd_name: "Dinas Pendidikan dan Kebudayaan",
    logo_url: undefined,
    alamat: "Jl. Ahmad Yani No. 6, Purbalingga, Jawa Tengah 53316",
    telepon: "(0281) 891126",
    fax: "(0281) 893456",
    email: "disdikbud@purbalinggakab.go.id",
    kode_pos: "53316",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-05-20T07:30:00Z",
  },
  B2: {
    id: "opd-settings-003",
    opd_code: "B2",
    opd_name: "Badan Pengelolaan Keuangan dan Pendapatan Asli Daerah",
    logo_url: undefined,
    alamat: "Jl. Onje No. 1, Purbalingga, Jawa Tengah 53316",
    telepon: "(0281) 891078",
    fax: "(0281) 893100",
    email: "bpkpad@purbalinggakab.go.id",
    kode_pos: "53316",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-04-10T09:00:00Z",
  },
  "20": {
    id: "opd-settings-005",
    opd_code: "20",
    opd_name: "Dinas Pemuda, Olahraga dan Pariwisata",
    logo_url: undefined,
    alamat: "Jl. Teuku Umar No. 12, Purbalingga, Jawa Tengah 53316",
    telepon: "(0281) 891234",
    fax: "(0281) 891235",
    email: "dinporapar@purbalinggakab.go.id",
    kode_pos: "53316",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-15T08:00:00Z",
  },
};

// List of all OPD (sourced from API SKPD mock, proxy by backend)
export const mockOpdList = [
  { kode_unit: "T8", nama: "Dinas Komunikasi dan Informatika" },
  { kode_unit: "20", nama: "Dinas Pemuda, Olahraga dan Pariwisata" },
  { kode_unit: "A1", nama: "Dinas Pendidikan dan Kebudayaan" },
  { kode_unit: "B2", nama: "Badan Pengelolaan Keuangan dan Pendapatan Asli Daerah" },
  { kode_unit: "D4", nama: "Dinas Pekerjaan Umum dan Penataan Ruang" },
  { kode_unit: "E5", nama: "Dinas Kesehatan" },
  { kode_unit: "F6", nama: "Dinas Pertanian" },
  { kode_unit: "G7", nama: "Dinas Sosial" },
  { kode_unit: "H8", nama: "Badan Perencanaan Pembangunan Daerah" },
  { kode_unit: "I9", nama: "Badan Kepegawaian dan Pengembangan SDM" },
];
