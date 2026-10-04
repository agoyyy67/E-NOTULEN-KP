"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Types ────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number; // ms, default 5000
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

// ── Context ──────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Visual config ────────────────────────────────────────────
const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; bgClass: string; iconClass: string; barClass: string }
> = {
  success: {
    icon:      <CheckCircle2 size={18} aria-hidden="true" />,
    bgClass:   "bg-white border-[var(--color-success)] border-l-4",
    iconClass: "text-[var(--color-success)]",
    barClass:  "bg-[var(--color-success)]",
  },
  error: {
    icon:      <XCircle size={18} aria-hidden="true" />,
    bgClass:   "bg-white border-[var(--color-error)] border-l-4",
    iconClass: "text-[var(--color-error)]",
    barClass:  "bg-[var(--color-error)]",
  },
  warning: {
    icon:      <AlertCircle size={18} aria-hidden="true" />,
    bgClass:   "bg-white border-[var(--color-warning)] border-l-4",
    iconClass: "text-[var(--color-warning)]",
    barClass:  "bg-[var(--color-warning)]",
  },
  info: {
    icon:      <Info size={18} aria-hidden="true" />,
    bgClass:   "bg-white border-[var(--color-info)] border-l-4",
    iconClass: "text-[var(--color-info)]",
    barClass:  "bg-[var(--color-info)]",
  },
};

// ── Single toast item UI ──────────────────────────────────────
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const cfg = variantConfig[item.variant];
  const duration = item.duration ?? 5000;

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), duration);
    return () => clearTimeout(timer);
  }, [item.id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "relative flex items-start gap-3",
        "w-[360px] max-w-[calc(100vw-32px)]",
        "p-4 rounded-[var(--radius-lg)]",
        "shadow-[var(--shadow-lg)]",
        "border border-[var(--color-border)]",
        "animate-slide-in-right",
        cfg.bgClass,
      )}
    >
      {/* Icon */}
      <span className={cn("flex-shrink-0 mt-0.5", cfg.iconClass)}>{cfg.icon}</span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-secondary-900">{item.title}</p>
        {item.message && (
          <p className="mt-0.5 text-[12px] text-secondary-500">{item.message}</p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Tutup notifikasi"
        className={cn(
          "flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded",
          "text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100",
          "transition-colors duration-100",
        )}
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div
        className={cn("absolute bottom-0 left-4 right-4 h-[2px] rounded-full origin-left", cfg.barClass)}
        style={{ animation: `shrinkWidth ${duration}ms linear forwards` }}
      />

      <style>{`
        @keyframes shrinkWidth {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  const ctx: ToastContextValue = useMemo(
    () => ({
      toast:   add,
      success: (title, message) => add({ variant: "success", title, message }),
      error:   (title, message) => add({ variant: "error",   title, message }),
      warning: (title, message) => add({ variant: "warning", title, message }),
      info:    (title, message) => add({ variant: "info",    title, message }),
    }),
    [add]
  );

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-label="Notifikasi sistem"
            className={cn(
              "fixed top-4 right-4 flex flex-col gap-2",
              "z-[var(--z-toast)] pointer-events-none",
            )}
          >
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto">
                <ToastCard item={t} onDismiss={dismiss} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
