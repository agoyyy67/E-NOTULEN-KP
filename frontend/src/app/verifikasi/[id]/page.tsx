"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CalendarDays,
  Clock,
  MapPin,
  Building2,
  FileText,
  UserCheck,
  PenLine,
  Download,
  Info,
  Check,
  Copy,
  Lock,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { formatDateIndonesian } from "@/lib/utils";

type VerificationInfo = {
  id: string;
  title: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  opd_name: string;
  status: "draft" | "final" | string;
  signed_by: string;
  signed_by_position: string;
  signed_by_nip: string;
  notulist_name: string;
  notulist_position: string;
  notulist_nip: string;
  finalized_at: string;
};

function formatDateTime(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return (
    d.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  );
}

export default function VerifikasiDokumenPage() {
  const params = useParams();
  const id = params.id as string;

  const [info, setInfo] = useState<VerificationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchVerification() {
      try {
        const res = await fetch(`/api/v1/public/verifikasi/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.message || "Dokumen tidak ditemukan pada arsip sistem.");
          return;
        }
        setInfo(json.data);
      } catch {
        setError("Gagal terhubung ke server verifikasi e-Notulen.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchVerification();
  }, [id]);

  const handleCopyId = () => {
    if (!info?.id) return;
    navigator.clipboard.writeText(info.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const header = (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo-purbalingga-official.png"
            alt="Lambang Pemkab Purbalingga"
            className="w-11 h-11 object-contain shrink-0 drop-shadow-xs"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold tracking-widest text-emerald-800 uppercase">
              Pemerintah Kabupaten Purbalingga
            </p>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              Portal Verifikasi Dokumen e-Notulen
            </h1>
          </div>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Resmi SPBE</span>
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center animate-pulse">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-800">Memeriksa Keaslian Naskah...</p>
            <p className="text-xs text-slate-500">Mencocokkan tanda verifikasi terhadap pangkalan data arsip resmi</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {header}
        <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex items-start sm:items-center">
          <div className="w-full bg-white rounded-3xl shadow-sm border border-red-200/90 p-6 sm:p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldX className="w-11 h-11" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 uppercase mb-2">
                Tidak Terdaftar
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Dokumen Tidak Terverifikasi
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {error || "Dokumen dengan identitas ini tidak ditemukan pada arsip sistem e-Notulen Pemerintah Kabupaten Purbalingga."}
            </p>
            <div className="pt-2 text-xs text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-1">
              <p className="font-semibold text-slate-700">Perhatian Keamanan:</p>
              <p>1. Pastikan Anda memindai kode QR langsung dari dokumen resmi bertanda tangan.</p>
              <p>2. Apabila dokumen ini diserahkan sebagai berkas fisik, naskah patut diduga tidak sah atau telah dimodifikasi tanpa izin.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isFinal = info.status === "final";
  const timeRange = info.start_time
    ? `${info.start_time.slice(0, 5)}${info.end_time ? ` - ${info.end_time.slice(0, 5)}` : ""} WIB`
    : "-";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {header}

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5 animate-page-in pb-12">
        {/* ── HERO BANNER STATUS KEABSAHAN ── */}
        {isFinal ? (
          <section
            id="verifikasi-status-final"
            className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-xl shadow-emerald-900/20 border border-emerald-500/30"
          >
            {/* Background decorative glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg text-white">
                  <ShieldCheck className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-200" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-2 border-emerald-800 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-950" />
                </div>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 text-xs font-bold tracking-wider uppercase border border-emerald-300/30 backdrop-blur-xs">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Dokumen Resmi & Terverifikasi</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Naskah Notulen Sah & Terdaftar
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed opacity-95">
                  Dokumen ini telah dilegalisasi dan tercatat dalam pangkalan data arsip digital resmi Pemerintah Kabupaten Purbalingga.
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] text-emerald-200 font-medium">
                  <span className="inline-flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-300" />
                    Waktu Pengesahan: {formatDateTime(info.finalized_at)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section
            id="verifikasi-status-draft"
            className="rounded-3xl p-6 bg-amber-50 border-2 border-amber-300/80 text-amber-950 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 shadow-inner">
                <ShieldAlert className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300 uppercase">
                  Status Draf Sementara
                </span>
                <h2 className="text-xl font-extrabold text-amber-950">Draf Notulen (Belum Dilegalisasi)</h2>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  Dokumen ini masih dalam proses penyusunan/penyuntingan dan belum disahkan oleh pejabat berwenang. Isi dokumen sewaktu-waktu dapat berubah sehingga belum dapat dijadikan rujukan hukum resmi.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── CARD 1: RINCIAN RAPAT ── */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Rincian Agenda Rapat
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
              Arsip Resmi
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Judul Rapat */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Judul / Agenda Rapat</p>
              <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {info.title}
              </h4>
            </div>

            {/* Nomor Registrasi dengan Tombol Salin */}
            <div className="flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/70">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">ID Registrasi Berkas</p>
                  <p className="font-mono text-xs font-bold text-slate-800 break-all">{info.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                title="Salin ID Registrasi"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-xs font-semibold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            {/* Grid Detail Waktu & Tempat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <DetailItem
                icon={<CalendarDays className="w-4 h-4" />}
                label="Hari & Tanggal"
                value={formatDateIndonesian(info.meeting_date)}
              />
              <DetailItem
                icon={<Clock className="w-4 h-4" />}
                label="Waktu Pelaksanaan"
                value={timeRange}
              />
              <DetailItem
                icon={<MapPin className="w-4 h-4" />}
                label="Tempat Pelaksanaan"
                value={info.location || "-"}
              />
              <DetailItem
                icon={<Building2 className="w-4 h-4" />}
                label="Instansi Penyelenggara"
                value={info.opd_name || "-"}
              />
            </div>
          </div>
        </section>

        {/* ── CARD 2: INFORMASI PENGESAHAN & PEJABAT ── */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Legalitas & Penanda Tangan
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Tervalidasi
            </span>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pejabat Penanda Tangan */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Pimpinan Rapat
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">Pengesah Dokumen</p>
                </div>
              </div>
              <div className="pt-1 space-y-0.5">
                <p className="text-sm font-bold text-slate-900 underline underline-offset-2">
                  {info.signed_by || "-"}
                </p>
                <p className="text-xs font-medium text-slate-700">
                  {info.signed_by_position || "Pimpinan Penanda Tangan"}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  NIP. {info.signed_by_nip || "-"}
                </p>
              </div>
            </div>

            {/* Notulis */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs">
                  <PenLine className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                    Notulis
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">Penyusun Naskah</p>
                </div>
              </div>
              <div className="pt-1 space-y-0.5">
                <p className="text-sm font-bold text-slate-900 underline underline-offset-2">
                  {info.notulist_name || "-"}
                </p>
                <p className="text-xs font-medium text-slate-700">
                  {info.notulist_position || "Staf Notulis"}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  NIP. {info.notulist_nip || "-"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TOMBOL UNDUH BERKAS RESMI (PERBAIKAN KONTRAS TINGGI) ── */}
        {isFinal && (
          <div className="pt-1">
            <a
              id="verifikasi-unduh-pdf"
              href={`/api/v1/public/verifikasi/${info.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#ffffff" }}
              className="w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-700/25 transition-all duration-200 active:scale-[0.99] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span className="block text-white font-bold leading-tight drop-shadow-xs">
                  Unduh Salinan Berkas Resmi (PDF)
                </span>
                <span className="block text-[11px] text-emerald-100 font-normal opacity-90">
                  Format Cetak A4 Standar • Dilengkapi Segel QR Code
                </span>
              </div>
            </a>
          </div>
        )}

        {/* ── CATATAN INTEGRITAS & HUKUM ── */}
        <section className="rounded-2xl bg-slate-100/90 border border-slate-200/90 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-600 leading-relaxed">
          <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-800 text-xs">Catatan Integritas Dokumen Elektronik:</p>
            <p>
              Halaman ini merupakan kanal verifikasi resmi sistem e-Notulen Pemerintah Kabupaten Purbalingga. Data yang tertera di atas dicocokkan secara langsung dengan basis data arsip digital pemerintah.
            </p>
            <p className="text-[11px] text-slate-500 italic pt-1">
              Apabila isi dokumen fisik atau cetak berbeda dengan informasi yang tertera pada layar ini, maka dokumen fisik tersebut patut diragukan keasliannya.
            </p>
          </div>
        </section>
      </main>

      {/* ── FOOTER RESMI PEMKAB ── */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">
          Dinas Komunikasi dan Informatika Kabupaten Purbalingga
        </p>
        <p className="text-[11px] text-slate-400">
          Jl. Letkol Isdiman No. 17A, Purbalingga, Jawa Tengah • Telp: (0281) 891044
        </p>
        <p className="text-[10px] text-slate-400 pt-1">
          © {new Date().getFullYear()} Pemerintah Kabupaten Purbalingga. Hak Cipta Dilindungi Undang-Undang.
        </p>
      </footer>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-200/60">
      <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">{label}</p>
        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug pt-0.5">{value}</p>
      </div>
    </div>
  );
}
