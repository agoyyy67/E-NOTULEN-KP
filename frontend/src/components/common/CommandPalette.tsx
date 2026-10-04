"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  CalendarDays,
  Building2,
  FileSpreadsheet,
  Settings,
  ArrowRight,
  Command,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  keywords: string[];
  group: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Ringkasan statistik & aktivitas terbaru",
    href: "/dashboard",
    icon: <LayoutDashboard size={16} />,
    keywords: ["beranda", "home", "statistik", "ringkasan"],
    group: "Navigasi Utama",
  },
  {
    id: "notulen-list",
    label: "Daftar Notulen",
    description: "Lihat semua risalah rapat yang tersimpan",
    href: "/notulen",
    icon: <FileText size={16} />,
    keywords: ["risalah", "daftar", "notulen", "rapat", "list"],
    group: "Notulen Rapat",
  },
  {
    id: "notulen-create",
    label: "Buat Notulen Baru",
    description: "Mulai pencatatan risalah rapat baru",
    href: "/notulen/create",
    icon: <PlusCircle size={16} />,
    keywords: ["buat", "tambah", "baru", "create", "notulen", "catat"],
    group: "Notulen Rapat",
  },
  {
    id: "reports-monthly",
    label: "Ringkasan Bulanan",
    description: "Rekap & laporan notulen per bulan",
    href: "/reports/monthly",
    icon: <CalendarDays size={16} />,
    keywords: ["laporan", "bulanan", "rekap", "ringkasan", "bulan", "monthly"],
    group: "Rekap & Laporan",
  },
  {
    id: "reports-opd",
    label: "Laporan Per OPD",
    description: "Statistik notulen per unit organisasi",
    href: "/reports/opd",
    icon: <Building2 size={16} />,
    keywords: ["laporan", "opd", "organisasi", "dinas", "unit"],
    group: "Rekap & Laporan",
  },
  {
    id: "reports-activities",
    label: "Daftar Aktivitas",
    description: "Riwayat semua aktivitas sistem",
    href: "/reports/activities",
    icon: <FileSpreadsheet size={16} />,
    keywords: ["aktivitas", "riwayat", "log", "history"],
    group: "Rekap & Laporan",
  },
  {
    id: "settings-opd",
    label: "Kop Surat OPD",
    description: "Atur logo & identitas resmi OPD",
    href: "/settings/opd",
    icon: <Settings size={16} />,
    keywords: ["kop", "surat", "logo", "opd", "identitas", "pengaturan", "settings"],
    group: "Pengaturan",
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter + score results
  const filtered = query.trim()
    ? COMMAND_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      })
    : COMMAND_ITEMS;

  // Group results
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  // All flat for keyboard nav
  const flatItems = Object.values(grouped).flat();

  // Reset on open/query change
  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Navigate to item
  const navigate = useCallback(
    (item: CommandItem) => {
      onClose();
      router.push(item.href);
    },
    [router, onClose],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flatItems.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
          break;
        case "Enter":
          e.preventDefault();
          if (flatItems[activeIndex]) navigate(flatItems[activeIndex]);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, flatItems, activeIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 pb-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Cepat"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari halaman atau fitur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
            aria-label="Cari navigasi"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Hapus teks"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <Search size={28} className="text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">Tidak ada hasil ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                Coba kata kunci lain, contoh: &quot;notulen&quot;, &quot;laporan&quot;, &quot;kop surat&quot;
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                {/* Group Label */}
                <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group}
                </p>
                {items.map((item) => {
                  const flatIdx = flatItems.indexOf(item);
                  const isActive = flatIdx === activeIndex;
                  const isCurrent = pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item)}
                      onMouseEnter={() => setActiveIndex(flatIdx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100",
                        isActive
                          ? "bg-emerald-50 text-emerald-900"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      {/* Icon */}
                      <span
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isActive
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {item.icon}
                      </span>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-semibold truncate",
                            isActive ? "text-emerald-800" : "text-slate-800",
                          )}
                        >
                          {item.label}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              Halaman Ini
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      {isActive && (
                        <ArrowRight size={15} className="text-emerald-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white text-slate-500 px-1 rounded border border-slate-200">↑↓</kbd>
              navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white text-slate-500 px-1 rounded border border-slate-200">Enter</kbd>
              buka
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white text-slate-500 px-1 rounded border border-slate-200">Esc</kbd>
              tutup
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Command size={11} />
            <span>e-Notulen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
