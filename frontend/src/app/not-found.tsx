import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-page-in">
        {/* Logo Purbalingga Branding */}
        <div className="flex justify-center">
          <Image
            src="/logo-purbalingga-official.png"
            alt="Logo Pemkab Purbalingga"
            width={64}
            height={64}
            className="object-contain drop-shadow-lg"
          />
        </div>

        {/* Visual Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-800/40 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
          <FileQuestion size={36} />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            404 — Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-400">
            Halaman atau dokumen notulen yang Anda cari tidak tersedia, telah dipindahkan, atau Anda tidak memiliki hak akses.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button
              variant="primary"
              size="md"
              className="bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-md"
            >
              <Home size={16} />
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>

        {/* Footer Brand */}
        <p className="text-xs text-slate-500 pt-6">
          e-Notulen &bull; Pemerintah Kabupaten Purbalingga
        </p>
      </div>
    </div>
  );
}
