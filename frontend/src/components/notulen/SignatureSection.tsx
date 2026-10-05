"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";


interface SignatureSectionProps {
  /** Name of the meeting leader */
  dipimpinNama: string;
  /** Position/title of the meeting leader */
  dipimpinJabatan?: string;
  /** NIP of the meeting leader */
  dipimpinNip?: string;
  /** Name of the signing official (Pimpinan Penanda Tangan). Falls back to dipimpinNama if not provided */
  pimpinanNama?: string;
  /** Position of the signing official */
  pimpinanJabatan?: string;
  /** NIP of the signing official */
  pimpinanNip?: string;
  /** Name of the note-taker */
  notulisNama: string;
  /** Position/title of the note-taker */
  notulisJabatan?: string;
  /** NIP of the note-taker */
  notulisNip?: string;
  /** Meeting date string (ISO) for the signature date */
  tanggal: string;
  /** City name for the signature line */
  kota?: string;
  /** Whether the component is read-only (detail view) */
  readOnly?: boolean;
  /** Notulen ID — dipakai untuk membangun URL QR Code verifikasi dokumen */
  notulenId?: string;
  /** Status dokumen. QR Code verifikasi hanya tampil bila status === "final" */
  status?: string;
}

/**
 * SignatureSection — Template tanda tangan 2 kolom di bagian paling bawah dokumen notulen.
 *
 * Layout:
 * - Kiri: Pimpinan (Jabatan, Area TTD, Nama bold+underline, NIP)
 * - Kanan: Tempat & Tanggal, Notulis, Area TTD, Nama bold+underline, Sub-Jabatan, NIP
 */
export function SignatureSection({
  dipimpinNama,
  dipimpinJabatan,
  dipimpinNip,
  pimpinanNama,
  pimpinanJabatan,
  pimpinanNip,
  notulisNama,
  notulisJabatan,
  notulisNip,
  tanggal,
  kota = "Purbalingga",
  readOnly = false,
  notulenId,
  status,
}: SignatureSectionProps) {
  // QR Code penelusuran dokumen hanya untuk dokumen final
  const showVerificationQR = status === "final" && !!notulenId;
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const verificationUrl = notulenId && origin ? `${origin}/verifikasi/${notulenId}` : "";

  // Determine TTD nama: gunakan pimpinan jika diisi, fallback ke dipimpin
  const ttdNama = pimpinanNama?.trim() || dipimpinNama;
  const ttdJabatan = pimpinanJabatan?.trim() || dipimpinJabatan;
  const ttdNip = pimpinanNip?.trim() || dipimpinNip;
  // Format date for signature: "Purbalingga, 13 Maret 2025"
  const formatSignatureDate = (dateStr: string): string => {
    if (!dateStr) return `${kota}, ...`;
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${kota}, ${day} ${month} ${year}`;
    } catch {
      return `${kota}, ...`;
    }
  };

  return (
    <div className="pt-8 space-y-4">
      <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">
        Tanda Tangan
      </h3>

      <div className="grid grid-cols-2 gap-8 pt-4 text-xs text-slate-800">
        {/* Left Column: Pimpinan Rapat */}
        <div className="text-center space-y-2">
          <p className="font-medium text-slate-700 leading-snug">
            {ttdJabatan || "Pimpinan Rapat"}
          </p>

          {/* Signature area placeholder (simetris dengan notulis) */}
          <div
            className={`h-20 mx-auto w-40 flex items-center justify-center rounded-lg ${
              readOnly
                ? "border border-dashed border-slate-200"
                : "border-2 border-dashed border-slate-300 bg-slate-50/50"
            }`}
          >
            <span className="text-[10px] text-slate-400 italic">
              {readOnly ? "" : "Area Tanda Tangan"}
            </span>
          </div>

          {/* Name + NIP */}
          <div className="space-y-0.5 pt-1">
            <p className="font-bold underline text-slate-900 text-sm">
              {ttdNama || "________________"}
            </p>
            {ttdNip ? (
              <p className="text-slate-600 text-[11px]">NIP. {ttdNip}</p>
            ) : (
              <p className="text-slate-400 text-[11px]">NIP. -</p>
            )}
          </div>
        </div>

        {/* Right Column: Notulis */}
        <div className="text-center space-y-2">
          {/* Place & Date */}
          <p className="font-medium text-slate-700 text-right pr-4 mb-2">
            {formatSignatureDate(tanggal)}
          </p>

          <p className="font-medium text-slate-700 leading-snug">
            Notulis
          </p>

          {/* Signature area placeholder */}
          <div
            className={`h-20 mx-auto w-40 flex items-center justify-center rounded-lg ${
              readOnly
                ? "border border-dashed border-slate-200"
                : "border-2 border-dashed border-slate-300 bg-slate-50/50"
            }`}
          >
            <span className="text-[10px] text-slate-400 italic">
              {readOnly ? "" : "Area Tanda Tangan"}
            </span>
          </div>

          {/* Name + Position + NIP */}
          <div className="space-y-0.5 pt-1">
            <p className="font-bold underline text-slate-900 text-sm">
              {notulisNama || "________________"}
            </p>
            {notulisJabatan && (
              <p className="text-slate-600 text-[11px]">{notulisJabatan}</p>
            )}
            {notulisNip && (
              <p className="text-slate-600 text-[11px]">NIP. {notulisNip}</p>
            )}
            {!notulisNip && (
              <p className="text-slate-400 text-[11px]">NIP. -</p>
            )}
          </div>
        </div>
      </div>

      {/* Standalone Verification Box (Opsi 1: Berdiri Sendiri di Bawah Tanda Tangan) */}
      {showVerificationQR && (
        <div
          id="document-verification-box"
          className="mt-8 pt-4 border-t border-dashed border-slate-200"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-sm">
            <div className="shrink-0 flex flex-col items-center gap-1">
              {verificationUrl ? (
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Klik untuk membuka halaman verifikasi dokumen"
                  className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
                >
                  <QRCodeSVG value={verificationUrl} size={76} level="M" />
                </a>
              ) : (
                <div className="w-[92px] h-[92px] rounded-lg bg-slate-100 animate-pulse border border-slate-200" />
              )}
              <span className="text-[10px] font-medium text-slate-500 text-center">
                Pindai QR Code
              </span>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Terverifikasi Sistem
                </span>
                <span className="font-semibold text-slate-800 text-xs">
                  Verifikasi Keaslian Dokumen Elektronik
                </span>
              </div>

              <p className="leading-relaxed text-slate-600 text-xs">
                Dokumen ini telah disahkan dan terdaftar secara elektronik pada <strong>Sistem Informasi e-Notulen Pemerintah Kabupaten Purbalingga</strong>.
              </p>
              <p className="text-[11px] text-slate-500 italic">
                Pindai QR Code di samping menggunakan kamera ponsel atau klik tautan untuk memeriksa integritas arsip dokumen ini.
              </p>

              {verificationUrl && (
                <div className="pt-0.5">
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium underline underline-offset-2 break-all"
                  >
                    <span>Buka Halaman Verifikasi Resmi &rarr;</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
