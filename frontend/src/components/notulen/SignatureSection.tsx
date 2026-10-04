"use client";

import React from "react";


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
}: SignatureSectionProps) {
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
    </div>
  );
}
