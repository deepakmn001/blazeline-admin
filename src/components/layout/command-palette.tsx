"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Package, Percent, ImagePlus, LayoutTemplate } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { navSections } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

const quickActions = [
  { label: "Add Product", href: "/products/new", icon: Package },
  { label: "New Offer", href: "/offers/new", icon: Percent },
  { label: "Upload Media", href: "/media", icon: ImagePlus },
  { label: "Edit Homepage", href: "/homepage-cms", icon: LayoutTemplate },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const allItems = navSections.flatMap((s) => s.items);
  const filtered = query
    ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  function go(href: string) {
    router.push(href);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0" onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && filtered[activeIndex]) {
          go(filtered[activeIndex].href);
        }
      }}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search className="h-4 w-4 text-ink-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search products, categories, pages…"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-faint outline-none"
          />
          <kbd className="rounded-md border border-line bg-canvas px-1.5 py-0.5 text-[10.5px] font-medium text-ink-faint">
            Esc
          </kbd>
        </div>

        <div className="max-h-[340px] overflow-y-auto scrollbar-thin p-2">
          {!query && (
            <div className="mb-2">
              <p className="px-2 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                Quick actions
              </p>
              <div className="grid grid-cols-2 gap-1.5 px-1">
                {quickActions.map((qa) => (
                  <button
                    key={qa.href}
                    onClick={() => go(qa.href)}
                    className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-[12.5px] font-medium text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <qa.icon className="h-3.5 w-3.5" />
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="px-2 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
            Pages
          </p>
          <ul>
            {filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <button
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-[13px] transition-colors",
                      idx === activeIndex ? "bg-brand-50 text-brand-700" : "text-ink-soft"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", idx === activeIndex ? "text-brand-600" : "text-ink-faint")} />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.description && (
                      <span className="text-[11.5px] text-ink-faint">{item.description}</span>
                    )}
                    <ArrowRight className={cn("h-3.5 w-3.5 opacity-0 transition-opacity", idx === activeIndex && "opacity-100")} />
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2.5 py-6 text-center text-[13px] text-ink-faint">No results for &quot;{query}&quot;</p>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
