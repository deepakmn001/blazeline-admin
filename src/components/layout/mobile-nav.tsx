"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { navSections, logoutItem } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <Logo />
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-black/[0.04]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className={cn("mb-1", sIdx !== 0 && "mt-4")}>
              {section.title && (
                <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] font-medium",
                          active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-black/[0.035]"
                        )}
                      >
                        <Icon className={cn("h-[17px] w-[17px]", active ? "text-brand-600" : "text-ink-faint")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-line p-3">
          <Link
            href={logoutItem.href}
            className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] font-medium text-ink-soft hover:bg-danger-bg hover:text-danger"
          >
            <logoutItem.icon className="h-[17px] w-[17px]" />
            Logout
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
