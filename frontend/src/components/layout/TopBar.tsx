"use client";

import React, { useState, useRef, useEffect } from "react";
import { Menu, LogOut, User, ChevronDown, Building, Shield, PanelLeftClose, PanelLeft, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Breadcrumb } from "./Breadcrumb";
import { RoleBadge } from "@/components/ui/Badge";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { CommandPalette } from "@/components/common/CommandPalette";

interface TopBarProps {
  onMenuToggle: () => void;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TopBar({ onMenuToggle, isSidebarCollapsed, onToggleCollapse }: TopBarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut to open command palette
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const userInitials = user?.displayName ? getInitials(user.displayName) : "U";

  return (
    <>
    <header data-topbar="true" className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-white/95 backdrop-blur border-b border-[var(--color-border)] shadow-[var(--shadow-xs)]">
      {/* Left: Mobile Toggle, Desktop Collapse Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 transition-colors lg:hidden cursor-pointer"
          aria-label="Buka Sidebar Navigation"
        >
          <Menu size={20} />
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center p-2 rounded-lg text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 transition-colors cursor-pointer"
            aria-label={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            title={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
        )}

        <Breadcrumb />
      </div>

      {/* Right: Search Button, User Profile & Actions */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-secondary-500 bg-secondary-50 border border-[var(--color-border)] hover:bg-secondary-100 hover:text-secondary-800 transition-colors cursor-pointer"
          title="Pencarian Cepat (Ctrl K)"
          aria-label="Buka Pencarian Cepat"
        >
          <Search size={14} />
          <span>Cari...</span>
          <kbd className="flex items-center gap-0.5 font-mono bg-white text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
            Ctrl K
          </kbd>
        </button>

        {/* Mobile search trigger icon-only */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex sm:hidden p-2 rounded-lg text-secondary-500 hover:text-secondary-900 hover:bg-secondary-100 transition-colors"
          title="Pencarian Cepat"
          aria-label="Buka Pencarian Cepat"
        >
          <Search size={18} />
        </button>
        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-secondary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-700 text-white font-semibold text-xs shadow-sm">
              {userInitials}
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-secondary-900 leading-tight truncate max-w-[140px]">
                {user?.displayName || "Pengguna"}
              </span>
              <span className="text-[10px] text-secondary-500 truncate max-w-[140px]">
                {user?.opdName || "Pemkab Purbalingga"}
              </span>
            </div>

            <ChevronDown size={14} className="text-secondary-400 hidden md:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[var(--color-border)] py-2 z-50 animate-scale-in">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-[var(--color-divider)]">
                <p className="text-xs font-bold text-secondary-900 truncate">
                  {user?.displayName}
                </p>
                {user?.email && (
                  <p className="text-[11px] text-secondary-500 truncate mt-0.5">
                    {user.email}
                  </p>
                )}
                {user?.nip && (
                  <p className="text-[10px] font-mono text-secondary-400 mt-1">
                    NIP: {user.nip}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  {user?.role && <RoleBadge role={user.role} />}
                </div>
              </div>

              {/* Menu Links */}
              {(user?.role === "admin" || user?.role === "operator") && (
                <div className="py-1">
                  <Link
                    href="/settings/opd"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900 transition-colors"
                  >
                    <Building size={15} className="text-secondary-400" />
                    <span>Pengaturan Kop OPD</span>
                  </Link>
                </div>
              )}

              {/* Logout Action */}
              <div className="border-t border-[var(--color-divider)] pt-1 mt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors text-left"
                >
                  <LogOut size={15} />
                  <span>Keluar dari Aplikasi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Command Palette — rendered outside header for proper z-index stacking */}
    <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
