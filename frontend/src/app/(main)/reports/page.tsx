"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Users,
  CheckCircle2,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/Card";
import { Table, THead, TBody, Tr, Th, Td, Pagination } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { getReportSummary, getReportActivities } from "@/lib/actions/reports";
import { getOpdSettings } from "@/lib/actions/settings";
import { mockOpdList } from "@/lib/data/settings";
import { formatDateIndonesian, getPublicImageUrl } from "@/lib/utils";
import type { ReportSummary, ReportActivity, OpdSettings } from "@/types/notulen";

export default function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [activities, setActivities] = useState<ReportActivity[]>([]);
  const [opdSettings, setOpdSettings] = useState<OpdSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [opdFilter, setOpdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadReportData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sumData, actData] = await Promise.all([
        getReportSummary({ date_from: dateFrom, date_to: dateTo, opd_code: opdFilter }),
        getReportActivities({
          date_from: dateFrom,
          date_to: dateTo,
          opd_code: opdFilter,
          status: statusFilter,
          page,
          per_page: 10,
        }),
      ]);
      setSummary(sumData || { total_notulen: 0, total_final: 0, total_draft: 0, total_peserta: 0, rata_peserta: 0 });
      setActivities(actData.items || []);
      setTotalPages(actData.meta?.total_pages || 1);
      setTotalItems(actData.meta?.total || 0);
    } catch (err) {
      console.error("Gagal memuat data laporan:", err);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, opdFilter, statusFilter, page]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  useEffect(() => {
    if (user?.opdCode) {
      getOpdSettings(user.opdCode).then((settings) => {
        if (settings) setOpdSettings(settings);
      });
    }
  }, [user?.opdCode]);

  // Export CSV
  const handleExportCsv = () => {
    if (activities.length === 0) {
      toast.error("Data Kosong", "Tidak ada data untuk diekspor.");
      return;
    }

    const headers = ["ID Notulen", "Judul Rapat", "Tanggal", "OPD", "Jumlah Peserta", "Status"];
    const rows = activities.map((a) => [
      a.id,
      `"${a.judul.replace(/"/g, '""')}"`,
      a.tanggal,
      `"${a.opd_name}"`,
      a.peserta_count,
      a.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `rekap-notulen-purbalingga-${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("File Excel (CSV) Berhasil Diunduh");
  };

  // Print Report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 animate-page-in pb-16">
      <style type="text/css">{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { width: 100% !important; table-layout: auto !important; }
        }
      `}</style>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-[var(--color-divider)] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
            Rekap & Laporan Notulen Rapat
          </h1>
          <p className="text-sm text-secondary-500 mt-0.5">
            Laporan rekapitulasi kegiatan dan kehadiran rapat instansi Pemkab Purbalingga
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={handleExportCsv}>
            <Download size={16} />
            Ekspor Excel (CSV)
          </Button>
          <Button variant="primary" size="md" onClick={handlePrintReport}>
            <Printer size={16} />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* Official Print Header (Visible on print only) */}
      <div className="hidden print:block mb-6">
        {/* Kop Surat */}
        <div className="flex items-center justify-between pb-3 mb-1 relative min-h-[64px]">
          <img
            src={opdSettings?.logo_url ? getPublicImageUrl(opdSettings.logo_url) : "/logo-purbalingga-official.png"}
            alt="Logo Kop Surat"
            className="w-16 h-16 object-contain absolute left-0 top-0"
          />
          <div className="text-center w-full px-16">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              PEMERINTAH KABUPATEN PURBALINGGA
            </h3>
            <h2 className="text-base font-extrabold uppercase tracking-wide">
              {opdSettings?.opd_name || user?.opdName || "DINAS PEMUDA, OLAHRAGA DAN PARIWISATA"}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {opdSettings?.alamat || "Purbalingga, Jawa Tengah"}
              {opdSettings?.telepon && ` | Telp: ${opdSettings.telepon}`}
            </p>
          </div>
        </div>
        {/* Double Line Divider — standar naskah dinas */}
        <div style={{ borderTop: '2.5px solid black', marginBottom: '1.5px' }} />
        <div style={{ borderTop: '1px solid black', marginBottom: '12px' }} />
        {/* Judul Laporan */}
        <h1 className="text-base font-bold uppercase text-center mb-0.5">
          LAPORAN REKAPITULASI NOTULEN HASIL RAPAT
        </h1>
        {(dateFrom || dateTo) && (
          <p className="text-xs text-center text-slate-600">
            Periode: {dateFrom ? formatDateIndonesian(dateFrom) : "Awal"} s/d {dateTo ? formatDateIndonesian(dateTo) : "Sekarang"}
          </p>
        )}
        <p className="text-xs text-center text-slate-500 font-mono mt-0.5">
          Dicetak pada: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })} WIB
        </p>
      </div>

      {/* Stat Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText size={22} className="text-emerald-700" />}
          label="Total Notulen"
          value={summary?.total_notulen ?? "0"}
        />
        <StatCard
          icon={<CheckCircle2 size={22} className="text-emerald-700" />}
          label="Notulen Final"
          value={summary?.total_final ?? "0"}
        />
        <StatCard
          icon={<Users size={22} className="text-teal-700" />}
          label="Total Peserta Hadir"
          value={summary?.total_peserta ?? "0"}
        />
        <StatCard
          icon={<BarChart3 size={22} className="text-indigo-700" />}
          label="Rata-rata Peserta / Rapat"
          value={summary?.rata_peserta ? `${Math.floor(summary.rata_peserta)} orang` : "0"}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
          {/* Date from */}
          <Input
            label="Dari Tanggal"
            fieldId="date-from"
            type="date"
            placeholder="Dari Tanggal"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            leftIcon={<Calendar size={15} />}
          />

          {/* Date to */}
          <Input
            label="Sampai Tanggal"
            fieldId="date-to"
            type="date"
            placeholder="Sampai Tanggal"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            leftIcon={<Calendar size={15} />}
          />

          {/* Status filter */}
          <Select
            label="Status Notulen"
            fieldId="status-report"
            options={[
              { value: "all", label: "Semua Status" },
              { value: "final", label: "Hanya Final" },
              { value: "draft", label: "Hanya Draft" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* OPD Filter (Admin only) */}
          {user?.role === "admin" && (
            <div className="w-48">
              <Select
                label="Instansi / OPD"
                fieldId="opd-report"
                options={[
                  { value: "", label: "Semua OPD" },
                  ...mockOpdList.map((o) => ({ value: o.kode_unit, label: o.nama })),
                ]}
                value={opdFilter}
                onChange={(e) => setOpdFilter(e.target.value)}
              />
            </div>
          )}

          <div className="self-end pb-0 md:pb-0 h-[66px] flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadReportData}
              title="Refresh Data"
              aria-label="Refresh Data"
              className="h-10"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : activities.length === 0 ? (
          <p className="p-8 text-center text-xs text-secondary-400">
            Tidak ada data laporan untuk periode atau filter yang dipilih.
          </p>
        ) : (
          <>
            <Table responsive>
              <THead>
                <Tr hoverable={false}>
                  <Th className="w-12 text-center">No</Th>
                  <Th>Judul / Agenda Rapat</Th>
                  <Th>Tanggal</Th>
                  <Th>OPD Pengampu</Th>
                  <Th className="text-center">Peserta Hadir</Th>
                  <Th className="text-center">Status</Th>
                </Tr>
              </THead>
              <TBody>
                {activities.map((item, index) => (
                  <Tr key={item.id}>
                    <Td className="text-center font-semibold text-secondary-500">
                      {(page - 1) * 10 + index + 1}
                    </Td>
                    <Td className="font-bold text-secondary-900">
                      {item.judul}
                    </Td>
                    <Td className="text-xs text-secondary-600 font-medium whitespace-nowrap">
                      {formatDateIndonesian(item.tanggal)}
                    </Td>
                    <Td className="text-xs text-secondary-800 font-semibold">
                      {item.opd_name}
                    </Td>
                    <Td className="text-center font-bold text-emerald-700">
                      {item.peserta_count} orang
                    </Td>
                    <Td className="text-center whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            {totalPages > 1 && (
              <div className="p-4 border-t border-[var(--color-divider)]">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={totalItems}
                  perPage={10}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
