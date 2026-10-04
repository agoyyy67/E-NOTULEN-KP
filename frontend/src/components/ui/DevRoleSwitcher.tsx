"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: {
  role: UserRole;
  label: string;
  desc: string;
  color: string;
}[] = [
  { role: "admin",    label: "Super Admin",  desc: "Akses semua OPD", color: "bg-primary-600" },
  { role: "operator", label: "Operator OPD", desc: "Diskominfo (T8)",  color: "bg-info-600 bg-[var(--color-info)]" },
  { role: "officer",  label: "Pegawai",      desc: "Rafli Firdausy",  color: "bg-secondary-600" },
];

export function DevRoleSwitcher() {
  const { user, switchMockRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Only render in mock mode
  if (!switchMockRole) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-[var(--z-toast)]",
          "bg-slate-900/90 text-white backdrop-blur-md",
          "hover:bg-slate-800 border border-slate-700",
          "px-3 py-1.5 rounded-full shadow-lg text-[11px] font-medium flex items-center gap-2",
          "transition-all duration-200 hover:scale-105",
        )}
        title="Buka Role Switcher"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-amber-400 font-bold uppercase text-[10px]">DEV</span>
        <span className="text-slate-300">Role:</span>
        <span className="font-semibold text-emerald-300">{user?.role ? user.role.toUpperCase() : "—"}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[var(--z-toast)]",
        "bg-slate-900 text-white",
        "rounded-2xl shadow-2xl",
        "p-3.5 flex flex-col gap-2.5 min-w-[220px]",
        "border border-slate-700",
        "text-[12px] animate-scale-in",
      )}
      role="complementary"
      aria-label="Dev: Role Switcher"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
            DEV MODE
          </span>
          <span className="text-slate-400 font-medium text-xs">Role Switcher</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 text-xs"
          title="Tutup Widget"
        >
          ✕
        </button>
      </div>

      {/* Current role */}
      <div className="text-[11px] text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-slate-800">
        Aktif: <strong className="text-emerald-400 font-semibold">{user?.displayName ?? "—"}</strong>
      </div>

      {/* Role buttons */}
      <div className="flex flex-col gap-1">
        {ROLE_CONFIG.map(({ role, label, desc }) => (
          <button
            key={role}
            onClick={() => {
              switchMockRole(role);
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl",
              "text-left transition-colors duration-100",
              "hover:bg-slate-800",
              user?.role === role
                ? "bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/40"
                : "text-slate-300",
            )}
            aria-pressed={user?.role === role}
          >
            <span className="flex-1">
              <span className="font-semibold block text-xs">{label}</span>
              <span className="text-[10px] text-slate-400 block">{desc}</span>
            </span>
            {user?.role === role && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
