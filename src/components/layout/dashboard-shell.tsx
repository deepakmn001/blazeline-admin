"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

      <div className={cn("flex min-h-screen flex-col transition-[margin] duration-200 ease-out", collapsed ? "lg:ml-[76px]" : "lg:ml-[260px]")}>
        <Topbar onOpenSearch={() => setSearchOpen(true)} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
