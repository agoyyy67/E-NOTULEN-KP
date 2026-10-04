"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const PATH_MAP: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ label: "Dashboard" }],
  "/notulen": [{ label: "Notulen Rapat" }, { label: "Daftar Notulen" }],
  "/notulen/create": [
    { label: "Notulen Rapat", href: "/notulen" },
    { label: "Buat Notulen Baru" },
  ],
  "/reports/monthly": [
    { label: "Rekap & Laporan" },
    { label: "Ringkasan Bulanan" },
  ],
  "/reports/opd": [{ label: "Rekap & Laporan" }, { label: "Laporan Per OPD" }],
  "/reports/activities": [
    { label: "Rekap & Laporan" },
    { label: "Daftar Aktivitas" },
  ],
  "/settings/opd": [{ label: "Pengaturan" }, { label: "Kop Surat OPD" }],
  "/settings/profile": [{ label: "Pengaturan" }, { label: "Profil Saya" }],
};

export function Breadcrumb() {
  const pathname = usePathname();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (PATH_MAP[pathname]) return PATH_MAP[pathname];

    // Handle dynamic paths like /notulen/[id] and /notulen/[id]/edit
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "notulen" && parts.length >= 2) {
      if (parts[2] === "edit") {
        return [
          { label: "Notulen Rapat", href: "/notulen" },
          { label: "Detail Notulen", href: `/notulen/${parts[1]}` },
          { label: "Edit Notulen" },
        ];
      }
      return [{ label: "Notulen Rapat", href: "/notulen" }, { label: "Detail Notulen" }];
    }

    return [{ label: "Halaman" }];
  };

  const items = getBreadcrumbs();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs font-medium text-secondary-500">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
      >
        <Home size={14} />
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={13} className="mx-1.5 text-secondary-300 flex-shrink-0" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-primary-600 transition-colors truncate max-w-[150px] sm:max-w-none"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-secondary-800 font-semibold truncate max-w-[150px] sm:max-w-none">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
