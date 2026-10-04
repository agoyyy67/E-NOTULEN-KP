"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Uncaught e-Notulen application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-page-in">
        {/* Logo Purbalingga Branding */}
        <div className="flex justify-center">
          <Image
            src="/logo-purbalingga-official.png"
            alt="Logo Pemkab Purbalingga"
            width={60}
            height={60}
            className="object-contain drop-shadow-lg"
          />
        </div>

        {/* Error Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-900/40 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg">
          <AlertTriangle size={32} />
        </div>

        {/* Details */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Terjadi Kesalahan Sistem
          </h1>
          <p className="text-xs text-slate-400">
            Aplikasi mengalami kendala saat memuat data. Anda dapat mencoba memuat ulang komponen atau kembali ke dashboard.
          </p>

          {error.message && (
            <div className="bg-slate-800/80 p-3 rounded-lg text-left text-[11px] font-mono text-red-300 border border-red-500/20 max-h-32 overflow-y-auto mt-3">
              {error.message}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={reset}
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
          >
            <RefreshCw size={16} />
            Coba Lagi
          </Button>

          <Link href="/dashboard">
            <Button
              variant="primary"
              size="md"
              className="bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-md"
            >
              <Home size={16} />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Footer Brand */}
        <p className="text-xs text-slate-500 pt-4">
          e-Notulen Pemkab Purbalingga &bull; Error Code: {error.digest || "SYS_ERR"}
        </p>
      </div>
    </div>
  );
}
