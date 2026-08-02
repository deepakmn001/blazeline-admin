import Link from "next/link";
import { Package, Percent, ImagePlus, LayoutTemplate, ArrowUpRight } from "lucide-react";

const actions = [
  { label: "Add Product", desc: "List a new item", href: "/products/new", icon: Package },
  { label: "New Offer", desc: "Launch a campaign", href: "/offers/new", icon: Percent },
  { label: "Upload Media", desc: "Add images or files", href: "/media", icon: ImagePlus },
  { label: "Edit Homepage", desc: "Update storefront", href: "/homepage-cms", icon: LayoutTemplate },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={[
            "group relative flex flex-col gap-4 rounded-xl border border-line bg-surface p-3.5",
            "transition-all duration-150 ease-out",
            "hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-card",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/[0.04] text-ink-soft transition-colors duration-150 group-hover:bg-brand-500 group-hover:text-white">
              <action.icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </div>
          <div>
            <p className="text-[12.5px] font-semibold text-ink">{action.label}</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">{action.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}