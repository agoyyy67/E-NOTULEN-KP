"use client";

/**
 * /auth/callback — Keycloak OIDC Callback Page
 *
 * Halaman ini adalah tujuan redirect dari server Keycloak setelah user
 * berhasil login SSO. Di sini kita:
 *  1. Menginisialisasi Keycloak JS adapter untuk membaca token dari URL
 *  2. Mengirimkan token ke backend Go untuk verifikasi (optional untuk sekarang)
 *  3. Redirect user ke /dashboard jika berhasil, atau ke /auth/login jika gagal
 *
 * Mode Mock: Tidak pernah melewati halaman ini (langsung redirect dari login).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { mapJwtToUserContext } from "@/lib/auth/keycloak";

type CallbackState = "loading" | "success" | "error";

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCallback = async () => {
      const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
      if (isMock) {
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 500);
        return;
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (!code) {
          setStatus("error");
          setErrorMessage("Kode otorisasi SSO tidak ditemukan. Silakan login kembali.");
          setTimeout(() => router.replace("/auth/login"), 2500);
          return;
        }

        const redirectUri = window.location.origin + "/auth/callback";

        const res = await fetch("/api/auth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, redirectUri }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errData.message || "Failed to exchange token via proxy");
        }

        const json = await res.json();
        const { access_token, refresh_token, expires_in } = json.data;

        if (!access_token) {
          setStatus("error");
          setErrorMessage("Token autentikasi tidak valid.");
          setTimeout(() => router.replace("/auth/login"), 2500);
          return;
        }

        const userContext = mapJwtToUserContext(access_token);
        if (!userContext) {
          setStatus("error");
          setErrorMessage("Gagal membaca profil user dari token SSO.");
          setTimeout(() => router.replace("/auth/login"), 2500);
          return;
        }

        const maxAge = expires_in || 3600;
        document.cookie = `access_token=${access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (refresh_token) {
          document.cookie = `refresh_token=${refresh_token}; path=/; max-age=${maxAge * 2}; SameSite=Lax`;
        }

        // Berhasil → tampilkan pesan sukses dan redirect ke dashboard
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 1200);

      } catch (err: any) {
        console.error("[Keycloak Callback Error]", err);
        setStatus("error");
        setErrorMessage(`Terjadi kesalahan: ${err.message || "Unknown error"}`);
        setTimeout(() => router.replace("/auth/login"), 5000);
      }
    };

    handleCallback();
  }, [router]);

  // ── Tampilan UI Callback Page ────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f4f8f5] flex flex-col items-center justify-center gap-6 p-6">
      {/* Logo Purbalingga */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <Image
          src="/logo-purbalingga-official.png"
          alt="Logo Pemkab Purbalingga"
          width={64}
          height={64}
          className="object-contain drop-shadow-md"
          priority
        />
      </div>

      {/* Status Loading */}
      {status === "loading" && (
        <div className="flex flex-col items-center gap-3 animate-fade-in text-center">
          <Loader2 size={36} className="text-[#00663d] animate-spin" />
          <h2 className="text-lg font-bold text-slate-800">
            Memverifikasi Sesi SSO...
          </h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Sedang memproses token autentikasi dari Keycloak SSO e-Akun Purbalingga.
            Harap tunggu sebentar.
          </p>
        </div>
      )}

      {/* Status Berhasil */}
      {status === "success" && (
        <div className="flex flex-col items-center gap-3 animate-scale-in text-center">
          <ShieldCheck size={40} className="text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-800">
            Autentikasi SSO Berhasil!
          </h2>
          <p className="text-sm text-slate-500">
            Mengalihkan ke Dashboard...
          </p>
        </div>
      )}

      {/* Status Error */}
      {status === "error" && (
        <div className="flex flex-col items-center gap-3 animate-fade-in text-center">
          <AlertTriangle size={40} className="text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">
            Autentikasi Gagal
          </h2>
          <p className="text-sm text-slate-500 max-w-xs">
            {errorMessage}
          </p>
          <p className="text-xs text-slate-400">
            Mengalihkan ke halaman login...
          </p>
        </div>
      )}

      {/* Footer */}
      <p className="text-[11px] text-slate-400 font-mono tracking-wider mt-4">
        E-NOTULEN SYSTEM &bull; SSO E-AKUN PURBALINGGA
      </p>
    </div>
  );
}
