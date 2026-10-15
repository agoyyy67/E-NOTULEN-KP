"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  Building2,
  ChevronDown,
  Settings,
  X,
  FileSpreadsheet,
  CalendarDays,
  Trash2,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

// ── Nav Data ─────────────────────────────────────────────────
interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  children?: {
    title: string;
    href: string;
    icon?: React.ReactNode;
    roles?: UserRole[];
  }[];
}

const NAVIGATION_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  {
    title: "Notulen Rapat",
    icon: <FileText size={18} />,
    children: [
      { title: "Daftar Notulen", href: "/notulen", icon: <FileText size={15} /> },
      { title: "Buat Notulen Baru", href: "/notulen/create", icon: <PlusCircle size={15} /> },
      { title: "Tempat Sampah", href: "/notulen?status=deleted", icon: <Trash2 size={15} /> },
    ],
  },
  {
    title: "Rekap & Laporan",
    icon: <BarChart3 size={18} />,
    children: [
      { title: "Ringkasan Bulanan", href: "/reports/monthly", icon: <CalendarDays size={15} /> },
      { title: "Laporan Per OPD", href: "/reports/opd", icon: <Building2 size={15} />, roles: ["admin"] },
      { title: "Daftar Aktivitas", href: "/reports/activities", icon: <FileSpreadsheet size={15} /> },
    ],
  },
  {
    title: "Pengaturan",
    icon: <Settings size={18} />,
    children: [
      { title: "Kop Surat OPD", href: "/settings/opd", icon: <Building2 size={15} />, roles: ["admin", "operator"] },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ── Smooth fade/slide helper for text labels ─────────────────
function FadeLabel({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
        show ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0 pointer-events-none",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────
export function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const userRole = user?.role || "officer";

  // Hover-expand state (desktop, when collapsed)
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (isCollapsed) {
      hoverTimer.current = setTimeout(() => setIsHovered(true), 120);
    }
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
  };

  // Reset hover state whenever collapsed state changes
  useEffect(() => {
    if (!isCollapsed) setIsHovered(false);
  }, [isCollapsed]);

  // Effective expanded state: expanded if not collapsed, OR if hovering
  const expanded = !isCollapsed || isHovered;

  // Submenus
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    "Notulen Rapat": true,
    "Rekap & Laporan": true,
    Pengaturan: false,
  });
  const toggleSubmenu = (t: string) =>
    setOpenSubmenus((p) => ({ ...p, [t]: !p[t] }));

  // Active helpers
  const isLinkActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };
  const isGroupActive = (item: NavItem) => {
    if (item.href) return isLinkActive(item.href);
    return item.children?.some((c) => isLinkActive(c.href)) ?? false;
  };
  const filterByRole = (roles?: UserRole[]) =>
    !roles || roles.includes(userRole);

  // ── Shared brand header ───────────────────────────────────
  const Brand = ({ withClose = false }: { withClose?: boolean }) => (
    <div
      className={cn(
        "flex items-center h-16 border-b border-slate-800/80 bg-slate-900/50 shrink-0 transition-all duration-300",
        expanded ? "px-5 justify-between" : "px-0 justify-center",
      )}
    >
      <Link
        href="/dashboard"
        className="flex items-center group min-w-0 overflow-hidden"
      >
        {/* Logo */}
        <div className="relative w-9 h-9 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
          <Image
            src="/logo-purbalingga-official.png"
            alt="Logo Pemkab Purbalingga"
            width={30}
            height={34}
            className="object-contain drop-shadow-sm"
            priority
          />
        </div>

        {/* Text */}
        <FadeLabel show={expanded} className="flex flex-col ml-3">
          <span className="font-extrabold text-[15px] tracking-tight text-white leading-tight block">
            e-Notulen
          </span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Pemkab Purbalingga
          </span>
        </FadeLabel>
      </Link>

      {/* Close button — mobile only */}
      {withClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
          aria-label="Tutup Menu"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );

  // ── User banner ───────────────────────────────────────────
  const UserBanner = () =>
    user ? (
      <div
        className={cn(
          "mx-2 my-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50",
          "flex items-center overflow-hidden shrink-0",
          "transition-all duration-300 ease-in-out",
          expanded ? "p-2.5" : "p-1.5 justify-center",
        )}
      >
        {/* Avatar */}
        <div
          title={!expanded ? `${user.displayName} (${user.role})` : undefined}
          className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 shadow-sm"
        >
          {user.displayName?.charAt(0)?.toUpperCase() ?? "U"}
        </div>

        {/* Name & OPD */}
        <FadeLabel show={expanded} className="flex flex-col ml-2.5 min-w-0">
          <span className="text-xs font-bold text-slate-200 truncate leading-snug block">
            {user.displayName}
          </span>
          <span className="text-[11px] text-slate-400 truncate block">
            {user.opdName || "Pemkab Purbalingga"}
          </span>
        </FadeLabel>

        {/* Role badge */}
        <span
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400",
            "border border-emerald-500/20 whitespace-nowrap shrink-0 ml-auto",
            "transition-all duration-300 ease-in-out overflow-hidden",
            expanded ? "opacity-100 max-w-[80px]" : "opacity-0 max-w-0 px-0 border-0 pointer-events-none",
          )}
        >
          {user.role === "admin"
            ? "Super Admin"
            : user.role === "operator"
            ? "Operator OPD"
            : "Pegawai"}
        </span>
      </div>
    ) : null;

  // ── Navigation ────────────────────────────────────────────
  const Nav = ({ closeFn }: { closeFn?: () => void }) => (
    <nav
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden space-y-2",
        "transition-all duration-300 ease-in-out",
        expanded ? "px-3 py-2" : "px-1.5 py-2 flex flex-col items-center",
      )}
    >
      {NAVIGATION_ITEMS.filter((item) => filterByRole(item.roles)).map((item) => {
        const filtered = item.children?.filter((c) => filterByRole(c.roles)) ?? [];
        if (item.children && filtered.length === 0) return null;

        const active = isGroupActive(item);
        const isExp = openSubmenus[item.title] ?? active;

        // ── Direct link (no sub-items) ───────────────────
        if (!item.children && item.href) {
          return (
            <Link
              key={item.title}
              href={item.href}
              title={!expanded ? item.title : undefined}
              onClick={closeFn}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200 ease-in-out",
                expanded
                  ? "w-full px-3 py-2.5 gap-3 border-l-[3px]"
                  : "w-10 h-10 justify-center border-l-0",
                active
                  ? "bg-slate-800 text-emerald-400 font-semibold border-emerald-500 shadow-sm"
                  : "text-slate-300 border-transparent hover:text-white hover:bg-slate-800/70",
              )}
            >
              <span
                className={cn(
                  "shrink-0 transition-colors duration-200 flex items-center justify-center",
                  active ? "text-emerald-400" : "text-slate-400",
                )}
              >
                {item.icon}
              </span>
              <FadeLabel show={expanded}>{item.title}</FadeLabel>
            </Link>
          );
        }

        // ── Group with sub-items ──────────────────────────
        return (
          <div
            key={item.title}
            className={cn(
              "transition-all duration-200",
              expanded
                ? "w-full"
                : "w-full flex flex-col items-center py-1 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1",
            )}
          >
            {/* Group Header Button */}
            <button
              onClick={() => {
                if (expanded) toggleSubmenu(item.title);
              }}
              title={!expanded ? item.title : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 ease-in-out",
                expanded
                  ? "w-full px-3 py-2.5 justify-between border-l-[3px]"
                  : "w-9 h-9 justify-center border-l-0",
                active
                  ? "text-emerald-400 bg-slate-800/90 border-emerald-500 shadow-sm font-bold"
                  : "text-slate-300 border-transparent hover:text-white hover:bg-slate-800/70",
              )}
            >
              {/* Icon + Title */}
              <div className="flex items-center overflow-hidden">
                <span
                  className={cn(
                    "shrink-0 transition-colors duration-200 flex items-center justify-center",
                    active ? "text-emerald-400" : "text-slate-400",
                  )}
                >
                  {item.icon}
                </span>
                <FadeLabel show={expanded} className="ml-3 font-medium">
                  {item.title}
                </FadeLabel>
              </div>

              {/* Chevron */}
              <ChevronDown
                size={15}
                className={cn(
                  "text-slate-400 shrink-0 transition-all duration-300 ease-in-out",
                  expanded ? "opacity-100 ml-1" : "opacity-0 w-0 ml-0 pointer-events-none",
                  isExp && expanded ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            {/* Submenus — Expanded view */}
            {expanded && (
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isExp ? "max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none",
                )}
              >
                <div className="pl-6 pr-1 space-y-0.5 py-1">
                  {filtered.map((child) => {
                    const childActive = isLinkActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={closeFn}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium",
                          "transition-all duration-150 border-l-2",
                          childActive
                            ? "bg-emerald-500/15 text-emerald-300 font-semibold border-emerald-500"
                            : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40",
                        )}
                      >
                        {child.icon && (
                          <span
                            className={cn(
                              "shrink-0",
                              childActive ? "text-emerald-400" : "text-slate-500",
                            )}
                          >
                            {child.icon}
                          </span>
                        )}
                        <span>{child.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submenus — Collapsed view: Neat, centered sub-icon pills with native tooltips */}
            {!expanded && (
              <div className="flex flex-col items-center space-y-1 w-full pt-0.5 pb-1">
                {/* Subtle connecting indicator line */}
                <div className="w-4 h-[1px] bg-slate-800 mb-0.5" />
                {filtered.map((child) => {
                  const childActive = isLinkActive(child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      title={child.title}
                      onClick={closeFn}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150",
                        childActive
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm scale-105"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60",
                      )}
                    >
                      <span className="shrink-0 flex items-center justify-center">
                        {child.icon ?? <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  // ── Footer (logout) ───────────────────────────────────────
  const Footer = ({ logoutFn }: { logoutFn: () => void }) => (
    <div
      className={cn(
        "border-t border-slate-800 shrink-0 transition-all duration-300 ease-in-out",
        expanded ? "p-3 space-y-2" : "p-2 flex flex-col items-center justify-center",
      )}
    >
      <button
        type="button"
        onClick={logoutFn}
        title={!expanded ? "Keluar dari Aplikasi" : undefined}
        className={cn(
          "flex items-center justify-center gap-2 py-2 rounded-xl",
          "text-xs font-semibold text-rose-400",
          "hover:text-white hover:bg-rose-950/50 border border-rose-900/30",
          "transition-all duration-200 cursor-pointer overflow-hidden",
          expanded ? "w-full px-3" : "w-9 h-9 p-0 border-transparent bg-rose-950/30",
        )}
      >
        <LogOut size={16} className="shrink-0" />
        <FadeLabel show={expanded}>Keluar dari Aplikasi</FadeLabel>
      </button>

      {/* Footer text */}
      <div
        className={cn(
          "text-center overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-12 opacity-100" : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <p className="text-[11px] text-slate-500">e-Notulen v1.0.0 &copy; 2026</p>
        <p className="text-[10px] text-slate-600 mt-0.5">Pemkab Purbalingga</p>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:flex lg:flex-col relative shrink-0 h-full",
          "transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <aside
          data-sidebar="true"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "flex flex-col h-full bg-slate-900 text-slate-100",
            "border-r border-slate-800/80",
            "transition-[width,box-shadow] duration-300 ease-in-out",
            isCollapsed && isHovered
              ? "absolute top-0 left-0 bottom-0 w-64 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.4)]"
              : "w-full",
          )}
        >
          <Brand />
          <UserBanner />
          <Nav />
          <Footer logoutFn={logout} />
        </aside>
      </div>

      {/* Mobile Drawer */}
      <aside
        data-sidebar-mobile="true"
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64",
          "bg-slate-900 text-slate-100",
          "border-r border-slate-800 shadow-2xl",
          "transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Brand withClose />
        <UserBanner />
        <Nav closeFn={onClose} />
        <Footer logoutFn={() => { onClose(); logout(); }} />
      </aside>
    </>
  );
}
