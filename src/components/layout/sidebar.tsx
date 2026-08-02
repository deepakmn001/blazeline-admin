"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { navSections, logoutItem } from "@/lib/nav-config";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-white transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b border-line", collapsed ? "justify-center px-0" : "px-5")}>
        <Link href="/dashboard">
          <Logo collapsed={collapsed} />
        </Link>
      </div>

      <TooltipProvider delayDuration={80}>
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className={cn("mb-1", sIdx !== 0 && "mt-4")}>
              {section.title && !collapsed && (
                <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                  const Icon = item.icon;
                  const link = (
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors",
                        collapsed && "justify-center px-0 py-2.5",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-soft hover:bg-black/[0.035] hover:text-ink"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-500" />
                      )}
                      <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-brand-600" : "text-ink-faint group-hover:text-ink-soft")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );

                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </TooltipProvider>

      <div className="shrink-0 border-t border-line p-3">
        <Link
          href={logoutItem.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-danger-bg hover:text-danger",
            collapsed && "justify-center px-0"
          )}
        >
          <logoutItem.icon className="h-[17px] w-[17px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-faint transition-colors hover:bg-black/[0.035] hover:text-ink-soft",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? <ChevronsRight className="h-[17px] w-[17px]" /> : <ChevronsLeft className="h-[17px] w-[17px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
