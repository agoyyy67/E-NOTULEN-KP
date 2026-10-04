"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { DevRoleSwitcher } from "@/components/ui/DevRoleSwitcher";

/**
 * Pages where sidebar should auto-collapse for max writing space.
 * Matches /notulen/create and /notulen/[id]/edit
 */
function isEditorRoute(pathname: string) {
  if (pathname === "/notulen/create") return true;
  // /notulen/[id]/edit
  if (/^\/notulen\/[^/]+\/edit$/.test(pathname)) return true;
  return false;
}

/**
 * Main app shell layout — wraps all authenticated pages.
 *
 * Smart Contextual Sidebar behaviour:
 *  • Editor pages  (/notulen/create, /notulen/[id]/edit)
 *      → sidebar auto-collapses to icon-only for maximum writing space
 *  • All other pages
 *      → sidebar auto-expands so navigation is always clearly visible
 *  • Manual toggle button in TopBar still works at any time;
 *    state resets automatically on next navigation.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Track whether the current collapse was triggered by the route (auto)
  // vs. the user manually pressing the toggle button.
  const autoCollapsedRef = useRef(false);

  useEffect(() => {
    const editor = isEditorRoute(pathname);

    if (editor) {
      // Always collapse when entering an editor page
      setSidebarCollapsed(true);
      autoCollapsedRef.current = true;
    } else {
      // Always expand when leaving an editor page OR navigating to any other route
      setSidebarCollapsed(false);
      autoCollapsedRef.current = false;
    }

    // Also close mobile drawer on route change
    setSidebarOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      autoCollapsedRef.current = false; // user took manual control
      return !prev;
    });
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-secondary-50">
          {/* Sidebar Navigation */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleCollapse}
          />

          {/* Main Content Area */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {/* Top Navigation Bar */}
            <TopBar
              onMenuToggle={() => setSidebarOpen((prev) => !prev)}
              isSidebarCollapsed={sidebarCollapsed}
              onToggleCollapse={toggleCollapse}
            />

            {/* Scrollable Viewport */}
            <main className="flex-1 overflow-y-auto min-h-0">
              {children}
            </main>
          </div>

          {/* Global Dev-Only Role Switcher */}
          <DevRoleSwitcher />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
