/**
 * data/reports.ts — Mock data for Rekap Laporan module
 * Source: PRD Bagian VI.8 — Rekap Laporan (Read-Only)
 */

import type { ReportSummary, ReportActivity } from "@/types/notulen";

export const mockReportSummary: ReportSummary = {
  total_notulen: 62,
  total_final: 48,
  total_draft: 14,
  total_peserta: 487,
  rata_peserta: 7.8,
};

export const mockReportActivities: ReportActivity[] = [
  {
    id: "notulen-001",
    judul: "Rapat Koordinasi Pengadaan SIPD Kabupaten Purbalingga Tahun 2026",
    tanggal: "2026-07-25",
    opd_name: "Diskominfo",
    peserta_count: 5,
    status: "final",
  },
  {
    id: "notulen-002",
    judul: "Rapat Internal Evaluasi Kinerja Triwulan II Diskominfo",
    tanggal: "2026-07-22",
    opd_name: "Diskominfo",
    peserta_count: 3,
    status: "draft",
  },
  {
    id: "notulen-003",
    judul: "Rapat Pembahasan Anggaran DAU Triwulan III Dinas Pendidikan",
    tanggal: "2026-07-18",
    opd_name: "Disdikbud",
    peserta_count: 8,
    status: "final",
  },
  {
    id: "notulen-004",
    judul: "Rapat Koordinasi Percepatan Realisasi Belanja Modal BPKPAD",
    tanggal: "2026-07-15",
    opd_name: "BPKPAD",
    peserta_count: 12,
    status: "final",
  },
  {
    id: "notulen-005",
    judul: "Rapat Persiapan Hari Jadi Kabupaten Purbalingga ke-193",
    tanggal: "2026-07-10",
    opd_name: "Diskoppora",
    peserta_count: 20,
    status: "draft",
  },
  {
    id: "notulen-006",
    judul: "Rapat Teknis Pembangunan Infrastruktur Jalan Dinas PUPR",
    tanggal: "2026-07-05",
    opd_name: "Dinas PUPR",
    peserta_count: 7,
    status: "final",
  },
];

export const mockOpdRanking = [
  { opd_name: "BPKPAD", total: 14 },
  { opd_name: "Diskominfo", total: 11 },
  { opd_name: "Disdikbud", total: 10 },
  { opd_name: "Dinkes", total: 9 },
  { opd_name: "Dinas PUPR", total: 8 },
  { opd_name: "Diskoppora", total: 5 },
  { opd_name: "Dinas Pertanian", total: 3 },
  { opd_name: "Dinas Sosial", total: 2 },
];
