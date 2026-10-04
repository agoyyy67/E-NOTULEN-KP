"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Building2,
  Printer,
  FileDown,
  Edit,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { getNotulenById, duplicateNotulen } from "@/lib/actions/notulen";
import { getOpdSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/Modal";
import { TiptapEditor } from "@/components/notulen/TiptapEditor";
import { AttendeeTable } from "@/components/notulen/AttendeeTable";
import { AttachmentManager } from "@/components/notulen/AttachmentManager";
import { SignatureSection } from "@/components/notulen/SignatureSection";
import { useToast } from "@/hooks/useToast";
import { formatDateIndonesian, getPublicImageUrl, getFileUrl } from "@/lib/utils";
import type { Notulen, OpdSettings } from "@/types/notulen";

export default function NotulenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const notulenId = resolvedParams.id;

  const router = useRouter();
  const toast = useToast();

  const [notulen, setNotulen] = useState<Notulen | null>(null);
  const [opdSettings, setOpdSettings] = useState<OpdSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Duplication state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getNotulenById(notulenId);
        if (!data) {
          toast.error("Notulen Tidak Ditemukan");
          router.push("/notulen");
          return;
        }
        setNotulen(data);

        // Load Kop Surat OPD Settings
        // Strategy: Try separate API call first, then fall back to embedded opd_settings
        // from the notulen detail response (which the backend always includes)
        let settings: OpdSettings | null = null;
        try {
          settings = await getOpdSettings(data.opd_code);
        } catch {
          // Separate API call failed (e.g. permission denied for officer role)
        }

        // Fallback: use embedded opd_settings from notulen detail response
        if (!settings) {
          const embedded = (data as unknown as Record<string, unknown>).opd_settings as Record<string, unknown> | undefined;
          if (embedded && typeof embedded === "object") {
            settings = {
              id: (embedded.kode_unit as string) || data.opd_code,
              opd_code: (embedded.kode_unit as string) || data.opd_code,
              opd_name: (embedded.opd_name as string) || data.opd_name || "",
              logo_url: (embedded.logo_url as string) || "",
              alamat: (embedded.address as string) || "",
              telepon: (embedded.phone as string) || "",
              email: (embedded.email as string) || "",
              created_at: (embedded.created_at as string) || new Date().toISOString(),
              updated_at: (embedded.updated_at as string) || new Date().toISOString(),
            };
          }
        }

        setOpdSettings(settings);
      } catch {
        toast.error("Gagal Memuat Detail Notulen");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [notulenId, router, toast]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!notulen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    toast.info(
      "Mengekspor PDF...",
      "Dokumen PDF resmi sedang digenerate dengan Kop Surat OPD.",
    );
    try {
      const res = await fetch(`/api/notulen/${notulenId}/pdf`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Notulen_Rapat_${notulenId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal Mengekspor PDF");
    }
  };

  const handleExportWord = async () => {
    toast.info(
      "Mengekspor Word...",
      "Dokumen Microsoft Word (.docx) sedang digenerate.",
    );
    try {
      const res = await fetch(`/api/notulen/${notulenId}/word`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Notulen_Rapat_${notulenId.substring(0, 8)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal Mengekspor Word");
    }
  };

  const handleDuplicateConfirm = async () => {
    try {
      setIsDuplicating(true);
      const dup = await duplicateNotulen(notulenId);
      toast.success("Notulen Berhasil Disalin", "Mengarahkan ke halaman edit...");
      router.push(`/notulen/${dup.id}/edit`);
    } catch {
      toast.error("Gagal Menyalin Notulen");
      setIsDuplicating(false);
      setShowDuplicateModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 animate-page-in">
      {/* Top Navigation & Actions Bar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-divider)] print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/notulen">
            <Button variant="ghost" size="sm" aria-label="Kembali ke Daftar Notulen">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">Detail Notulen</h1>
              <StatusBadge status={notulen.status} />
            </div>
            <p className="text-xs text-secondary-400 font-medium">{notulen.judul}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/notulen/${notulen.id}/edit`}>
            <Button variant="primary" size="md">
              <Edit size={16} />
              Edit
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowDuplicateModal(true)}
          >
            <Copy size={16} />
            Duplikat
          </Button>

          <Button variant="secondary" size="md" onClick={handleExportPdf}>
            <FileDown size={16} />
            PDF
          </Button>

          <Button variant="secondary" size="md" onClick={handleExportWord}>
            <FileText size={16} />
            Word
          </Button>

          <Button variant="ghost" size="md" onClick={handlePrint} title="Cetak Halaman">
            <Printer size={16} />
            Cetak
          </Button>
        </div>
      </div>

      {/* Official Document Container (Kop Surat & Content) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        {/* Official Kop Surat Header */}
        <div className="border-b-4 border-double border-slate-900 pb-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-4">
            {/* Logo OPD / Pemkab Purbalingga */}
            {opdSettings?.logo_url ? (
              <img
                src={getPublicImageUrl(opdSettings.logo_url)}
                alt="Logo OPD"
                className="w-16 h-16 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo-purbalingga-official.png";
                }}
              />
            ) : (
              <img
                src="/logo-purbalingga-official.png"
                alt="Logo Pemkab Purbalingga"
                className="w-16 h-16 object-contain flex-shrink-0"
              />
            )}
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">
                PEMERINTAH KABUPATEN PURBALINGGA
              </h2>
              <h1 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
                {(opdSettings?.opd_code === notulen.opd_code && opdSettings?.opd_name) || notulen.opd_name || "DINAS KOMUNIKASI DAN INFORMATIKA"}
              </h1>
              {opdSettings?.alamat && (
                <p className="text-[11px] text-slate-600 font-medium">
                  {opdSettings.alamat}
                </p>
              )}
              <p className="text-[10px] text-slate-500 font-mono">
                {opdSettings?.telepon && `Telp: ${opdSettings.telepon}`}
                {opdSettings?.email && ` | Email: ${opdSettings.email}`}
              </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1 pt-2">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            NOTULEN
          </h2>
          <h3 className="text-base font-semibold text-slate-800 leading-snug">
            {notulen.judul}
          </h3>
        </div>

        {/* Official Dinas Metadata & Dihadiri Oleh (Gambar 1) */}
        <div className="space-y-2 text-xs sm:text-sm text-slate-800 pt-2 font-serif">
          <div className="flex">
            <span className="w-32 sm:w-36 font-semibold shrink-0">Hari, Tanggal</span>
            <span className="px-2 shrink-0">:</span>
            <span className="font-medium">{formatDateIndonesian(notulen.tanggal)}</span>
          </div>

          <div className="flex">
            <span className="w-32 sm:w-36 font-semibold shrink-0">Waktu</span>
            <span className="px-2 shrink-0">:</span>
            <span className="font-medium">
              {notulen.waktu_mulai} - {notulen.waktu_selesai} WIB
            </span>
          </div>

          <div className="flex">
            <span className="w-32 sm:w-36 font-semibold shrink-0">Tempat</span>
            <span className="px-2 shrink-0">:</span>
            <span className="font-medium">{notulen.tempat || "—"}</span>
          </div>

          <div className="flex">
            <span className="w-32 sm:w-36 font-semibold shrink-0">Dipimpin Oleh</span>
            <span className="px-2 shrink-0">:</span>
            <span className="font-medium">
              {notulen.dipimpin_nama}
              {notulen.dipimpin_jabatan ? `, ${notulen.dipimpin_jabatan}` : ""}
            </span>
          </div>

          <div className="flex">
            <span className="w-32 sm:w-36 font-semibold shrink-0">Dihadiri Oleh</span>
            <span className="px-2 shrink-0">:</span>
            <div className="flex-1">
              {notulen.attendees && notulen.attendees.length > 0 ? (
                <ol className="list-decimal list-inside space-y-1">
                  {notulen.attendees.map((att, idx) => (
                    <li key={att.id || idx} className="leading-relaxed">
                      <span className="font-medium">{att.nama}</span>
                      {(att.instansi || att.jabatan) && (
                        <span className="text-slate-600">
                          {" "}
                          – {[att.instansi, att.jabatan].filter(Boolean).join(" / ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
        </div>

        {/* Notulen Content (Tiptap Content langsung menyambung - Gambar 1) */}
        <div className="pt-6 font-serif leading-relaxed text-slate-900">
          {notulen.input_type === "upload" && notulen.file_url ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col h-[600px]">
              <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <FileText className="text-emerald-700" size={24} />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Dokumen Fisik (PDF / Word)
                    </h4>
                    <p className="text-xs text-slate-500">
                      File risalah diunggah sebagai lampiran dokumen resmi
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.open(getFileUrl(notulen.file_url), "_blank")}
                >
                  <FileDown size={14} className="mr-1.5" />
                  Buka / Unduh Dokumen
                </Button>
              </div>
              {notulen.file_url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={getFileUrl(notulen.file_url)}
                  className="w-full flex-1 border-0"
                  title="Preview Dokumen Notulen PDF"
                />
              ) : (
                <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                    <FileText size={36} />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="text-base font-bold text-slate-800 font-sans">
                      Dokumen Risalah Format Microsoft Word (.docx / .doc)
                    </h4>
                    <p className="text-xs text-slate-500 font-sans leading-relaxed">
                      Browser web tidak dapat menampilkan pratinjau langsung untuk berkas Microsoft Word secara native. Silakan klik tombol di bawah untuk mengunduh dan membuka dokumen risalah ini.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => window.open(getFileUrl(notulen.file_url), "_blank")}
                    className="mt-2"
                  >
                    <FileDown size={16} className="mr-2" />
                    Unduh / Buka Dokumen Word (.docx)
                  </Button>
                </div>
              )}




            </div>
          ) : (
            <TiptapEditor content={notulen.content || ""} readOnly={true} />
          )}
        </div>

        {/* Signature Section */}
        <div className="pt-8">
          <SignatureSection
            dipimpinNama={notulen.dipimpin_nama}
            dipimpinJabatan={notulen.dipimpin_jabatan}
            dipimpinNip={notulen.dipimpin_nip}
            pimpinanNama={notulen.pimpinan_nama}
            pimpinanJabatan={notulen.pimpinan_jabatan}
            pimpinanNip={notulen.pimpinan_nip}
            notulisNama={notulen.notulis_nama}
            notulisJabatan={notulen.notulis_jabatan}
            notulisNip={notulen.notulis_nip}
            tanggal={notulen.tanggal}
            readOnly
          />
        </div>

        {/* Dokumentasi Kegiatan Page Header & Photos (Gambar 2) */}
        {notulen.attachments && notulen.attachments.length > 0 && (
          <div className="pt-16 border-t-2 border-dashed border-slate-300 mt-16 space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                DOKUMENTASI KEGIATAN
              </h2>
            </div>

            <div className="space-y-1.5 text-xs sm:text-sm text-slate-800 font-serif max-w-2xl">
              <div className="flex">
                <span className="w-32 sm:w-36 font-semibold shrink-0">Nama Rapat</span>
                <span className="px-2 shrink-0">:</span>
                <span className="font-bold text-slate-900">{notulen.judul}</span>
              </div>
              <div className="flex">
                <span className="w-32 sm:w-36 font-semibold shrink-0">Hari / Tanggal</span>
                <span className="px-2 shrink-0">:</span>
                <span className="font-medium">{formatDateIndonesian(notulen.tanggal)}</span>
              </div>
              <div className="flex">
                <span className="w-32 sm:w-36 font-semibold shrink-0">Waktu</span>
                <span className="px-2 shrink-0">:</span>
                <span className="font-medium">
                  {notulen.waktu_mulai} - {notulen.waktu_selesai} WIB
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 pt-4">
              {notulen.attachments.map((att, idx) => (
                <div
                  key={att.id || idx}
                  className="w-full max-w-xl border border-slate-400 rounded-md overflow-hidden bg-white shadow-xs p-1"
                >
                  <img
                    src={getPublicImageUrl(att.url || (att as any).file_url)}
                    alt={att.filename || (att as any).file_name || `Dokumentasi Foto ${idx + 1}`}
                    className="w-full h-auto object-contain max-h-[450px]"
                  />
                  {(att.filename || (att as any).file_name) && (
                    <p className="text-center text-xs text-slate-600 italic py-1 border-t border-slate-100 mt-1">
                      {att.filename || (att as any).file_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={handleDuplicateConfirm}
        loading={isDuplicating}
        title="Duplikat Notulen?"
        message="Notulen ini akan diduplikasi beserta seluruh isinya. Anda akan diarahkan ke halaman edit notulen yang baru."
        confirmLabel="Ya, Duplikat"
      />
    </div>
  );
}
