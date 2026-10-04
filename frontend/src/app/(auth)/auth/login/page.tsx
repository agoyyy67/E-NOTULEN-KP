"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FileText,
  KeyRound,
  Info,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  Lock,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { UserRole } from "@/types/auth";
import { getKeycloakInstance } from "@/lib/auth/keycloak";

export default function LoginPage() {
  const router = useRouter();
  const { switchMockRole } = useAuth();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ── Deteksi mode: Mock (development) atau Real Keycloak SSO ─────
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const isDevelopment = process.env.NODE_ENV !== "production" || isMock;

  // ── Handle Login: Dukung dua mode (Mock & Keycloak Real) ────────
  const handleKeycloakLogin = async (roleOverride?: UserRole) => {
    const roleToUse = roleOverride || selectedRole;

    if (isMock) {
      // ── Mode Mock (Development / UI Testing) ──────────────────
      try {
        setIsLoading(true);
        toast.info(
          "Menghubungkan ke SSO e-Akun Purbalingga...",
          "Mengautentikasi akun e-Akun Purbalingga",
        );

        await new Promise((resolve) => setTimeout(resolve, 800));

        if (switchMockRole) {
          switchMockRole(roleToUse);
        }

        toast.success(
          "Autentikasi SSO Berhasil",
          `Selamat datang! Masuk sebagai ${
            roleToUse === "admin"
              ? "Super Admin (Diskominfo)"
              : roleToUse === "operator"
              ? "Operator OPD"
              : "Pegawai Notulis"
          }.`,
        );

        router.push("/dashboard");
      } catch {
        toast.error("Gagal Autentikasi SSO", "Terjadi kesalahan saat simulasi login.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // ── Mode Keycloak SSO Asli (Production / Integration) ──────
      try {
        setIsLoading(true);
        toast.info(
          "Menghubungkan ke SSO e-Akun Purbalingga...",
          "Anda akan diarahkan ke halaman login e-Akun Purbalingga.",
        );

        const { getKeycloakLoginUrl } = await import("@/lib/auth/keycloak");
        const redirectUri = window.location.origin + "/auth/callback";
        const loginUrl = getKeycloakLoginUrl(redirectUri);

        window.location.href = loginUrl;
      } catch {
        toast.error(
          "Gagal Autentikasi SSO",
          "Tidak dapat menginisialisasi login. Pastikan konfigurasi SSO benar.",
        );
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 font-sans overflow-x-hidden">
      {/* ============================================================
          LEFT COLUMN: Refined Emerald Green Hero & Branding
         ============================================================ */}
      <div className="relative bg-gradient-to-br from-[#032e22] via-primary-900 to-primary-800 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between items-start min-h-[480px] lg:min-h-screen overflow-hidden">
        {/* Pendopo Dipokusumo Background Image */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Image
            src="/pendopo-purbalingga.png"
            alt="Pendopo Dipokusumo Kabupaten Purbalingga"
            fill
            className="object-cover object-center opacity-30 mix-blend-overlay filter brightness-105 contrast-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#032e22]/85 via-primary-900/40 to-transparent pointer-events-none" />
        </div>

        {/* Top Header Logo, Brand Title & Headline Stack */}
        <div className="z-10 space-y-6 text-left max-w-lg animate-page-in">
          {/* Logo & E-NOTULEN Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo-purbalingga-official.png"
                alt="Logo Resmi Pemerintah Kabupaten Purbalingga"
                width={56}
                height={64}
                className="object-contain filter drop-shadow-md"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs leading-tight">
                E-NOTULEN
              </span>
              <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-emerald-200/90 uppercase">
                Kabupaten Purbalingga
              </span>
            </div>
          </div>

          {/* Headline Stack */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.18] text-left drop-shadow-xs pt-1">
            Digitalisasi
            <br />
            Notulensi
            <br />
            Pemerintah
          </h1>
        </div>

        {/* Bottom Description Footer Stack */}
        <div className="z-10 text-left pt-6 max-w-md w-full">
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium drop-shadow-xs">
            Sistem Manajemen Notulensi Terintegrasi untuk Pemerintah Kabupaten Purbalingga. Cepat, aman, dan efisien.
          </p>
        </div>
      </div>

      {/* ============================================================
          RIGHT COLUMN: Minimalist SSO Login in Framed Card
         ============================================================ */}
      <div className="bg-slate-100/70 text-slate-800 p-6 sm:p-10 lg:p-14 flex flex-col justify-between items-center min-h-[550px] lg:min-h-screen relative">
        {/* Top Spacer */}
        <div className="w-full" />

        {/* Center Card Container */}
        <div className="my-auto w-full max-w-md bg-white border border-slate-200/80 rounded-lg shadow-2xl shadow-slate-300/60 p-6 sm:p-8 space-y-6 text-center animate-scale-in">
          {/* Greeting Header */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Selamat Datang Kembali
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              Silakan masuk ke akun Anda menggunakan SSO e-Akun Purbalingga untuk melanjutkan akses layanan.
            </p>
          </div>

          {/* Action Stack */}
          <div className="space-y-4 pt-1">
            {/* Keycloak SSO Action Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleKeycloakLogin()}
              className="w-full py-3.5 px-5 bg-primary-800 hover:bg-primary-900 text-white font-bold rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm sm:text-base cursor-pointer group"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengautentikasi...</span>
                </>
              ) : (
                <>
                  <KeyRound size={19} className="text-emerald-300 group-hover:rotate-12 transition-transform duration-300 flex-shrink-0" />
                  <span>Masuk dengan SSO e-Akun Purbalingga</span>
                </>
              )}
            </button>

            {/* Sub-note & Server Status Indicator */}
            <div className="space-y-2 pt-1">
              <p className="text-[12px] text-slate-500 font-medium leading-normal">
                Gunakan akun resmi <strong className="font-semibold text-slate-700">e-Akun Purbalingga</strong>
              </p>
              
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Server SSO Aktif & Aman</span>
              </div>
            </div>

            {/* Prototype Role Preset Selector Trigger (Development Mode Only) */}
            {isDevelopment && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <span>Role: <strong className="text-slate-700">{selectedRole === "admin" ? "Super Admin" : selectedRole === "operator" ? "Operator OPD" : "Pegawai Notulis"}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(true)}
                  className="font-bold text-primary-700 hover:underline text-[10px] bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  Ubah Role
                </button>
              </div>
            )}
          </div>

          {/* Links Below */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-xs font-bold text-primary-800 hover:text-primary-900 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle size={14} />
                <span>Bantuan Login</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
              <a
                href="#guide"
                onClick={(e) => {
                  e.preventDefault();
                  setShowHelpModal(true);
                }}
                className="hover:text-slate-700 transition-colors inline-flex items-center gap-1"
              >
                <BookOpen size={13} />
                <span>Panduan Penggunaan</span>
              </a>
              <span className="text-slate-300">&bull;</span>
              <a
                href="#privacy"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Kebijakan Privasi", "Sistem e-Notulen mematuhi standar enkripsi data Pemkab Purbalingga.");
                }}
                className="hover:text-slate-700 transition-colors inline-flex items-center gap-1"
              >
                <Lock size={13} />
                <span>Kebijakan Privasi</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Brand */}
        <div className="w-full flex items-center justify-center pt-6 pb-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity">
            <div className="relative w-7 h-8 flex-shrink-0">
              <Image
                src="/logo-purbalingga-official.png"
                alt="Logo Pemkab Purbalingga"
                width={28}
                height={32}
                className="object-contain"
              />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                Pemerintah Kabupaten Purbalingga
              </p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                e-Akun Purbalingga
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          PROTOTYPE ROLE SELECTOR MODAL
         ============================================================ */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#00663d]" />
                <h3 className="font-bold text-slate-900 text-base">
                  Simulasi Role SSO e-Akun
                </h3>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pilih peran akun SSO yang ingin disimulasikan untuk menguji hak akses modul e-Notulen:
            </p>

            <div className="space-y-2.5">
              {[
                {
                  role: "admin" as UserRole,
                  title: "Super Admin (Diskominfo)",
                  desc: "Akses penuh seluruh OPD, manajemen user & rekapitulasi",
                  badge: "Full Access",
                },
                {
                  role: "operator" as UserRole,
                  title: "Operator OPD",
                  desc: "Kelola notulen & daftar hadir internal Dinas Kominfo",
                  badge: "OPD Scope",
                },
                {
                  role: "officer" as UserRole,
                  title: "Pegawai Notulis",
                  desc: "Membuat draft notulen & mengisi rincian kegiatan",
                  badge: "Draft & Entry",
                },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => {
                    setSelectedRole(item.role);
                    setShowRoleModal(false);
                    handleKeycloakLogin(item.role);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    selectedRole === item.role
                      ? "border-[#00663d] bg-emerald-50/60 ring-2 ring-[#00663d]/20"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-900 block">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-snug">
                      {item.desc}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#00663d]/10 text-[#00663d] whitespace-nowrap">
                    {item.badge}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          BANTUAN LOGIN MODAL
         ============================================================ */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} className="text-[#00663d]" />
                <h3 className="font-bold text-slate-900 text-base">
                  Bantuan & Petunjuk Login SSO
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">1. Apa itu SSO e-Akun Purbalingga?</p>
                <p>
                  SSO e-Akun Purbalingga adalah layanan autentikasi tunggal Pemkab Purbalingga.
                  Satu akun NIP/SSO dapat digunakan untuk mengakses seluruh aplikasi kedinasan.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">2. Belum Memiliki Akun SSO?</p>
                <p>
                  Silakan hubungi tim Admin IT Diskominfo Purbalingga untuk verifikasi NIP dan penerbitan kredensial SSO Kedinasan.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 bg-[#00663d] hover:bg-[#005231] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
