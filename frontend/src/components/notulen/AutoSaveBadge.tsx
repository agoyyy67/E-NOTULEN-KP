"use client";

import React from "react";
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";

interface AutoSaveBadgeProps {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  className?: string;
}

/**
 * AutoSaveBadge — Indikator visual status auto-save real-time.
 * Menampilkan salah satu dari 4 kondisi: idle | saving | saved | error
 */
export function AutoSaveBadge({ status, lastSavedAt, className }: AutoSaveBadgeProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "idle" && !lastSavedAt) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all duration-300 ease-in-out select-none shrink-0 border whitespace-nowrap",
        status === "saving" && "bg-amber-50 text-amber-700 border-amber-200/80",
        status === "saved" && "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        status === "error" && "bg-rose-50 text-rose-700 border-rose-200/80",
        status === "idle" && "bg-slate-50 text-slate-600 border-slate-200/80",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Status penyimpanan: ${status}`}
    >
      {status === "saving" && (
        <>
          <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />
          <span>Menyimpan draft...</span>
        </>
      )}

      {status === "saved" && (
        <>
          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
          <span>
            Tersimpan
            {lastSavedAt && (
              <span className="font-normal ml-1 opacity-90">
                pukul {formatTime(lastSavedAt)}
              </span>
            )}
          </span>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle size={12} className="text-rose-500 shrink-0 animate-pulse" />
          <span>Gagal menyimpan</span>
        </>
      )}

      {status === "idle" && lastSavedAt && (
        <>
          <Cloud size={12} className="text-slate-400 shrink-0" />
          <span>Tersimpan pukul {formatTime(lastSavedAt)}</span>
        </>
      )}
    </div>
  );
}
