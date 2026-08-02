"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Plus,
  Menu,
  ChevronRight,
  Package,
  Percent,
  ImagePlus,
  LayoutTemplate,
  FolderPlus,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navSections } from "@/lib/nav-config";


const allNavItems = navSections.flatMap((s) => s.items);

function useBreadcrumb() {
  const pathname = usePathname() || "/dashboard";
  const match = allNavItems.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const segments = pathname.split("/").filter(Boolean);
  const isSubpage = match && pathname !== match.href;
  const subpageLabel = isSubpage ? segments[segments.length - 1].replace(/-/g, " ") : null;

  return { section: match?.label ?? "Dashboard", subpage: subpageLabel };
}

const quickAddItems = [
  { label: "Product", icon: Package, href: "/products/new" },
  { label: "Category", icon: FolderPlus, href: "/categories/new" },
  { label: "Offer", icon: Percent, href: "/offers/new" },
  { label: "Media", icon: ImagePlus, href: "/media" },
  { label: "Homepage Block", icon: LayoutTemplate, href: "/homepage-cms" },
];
const recentActivity: never[] = [];

export function Topbar({
  onOpenSearch,
  onOpenMobileNav,
}: {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}) {
  const { section, subpage } = useBreadcrumb();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMobileNav}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-black/[0.04] lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-ink-faint md:flex">
        <span className="font-medium text-ink-soft">{section}</span>
        {subpage && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="capitalize text-ink-faint">{subpage}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={onOpenSearch}
        className="hidden items-center gap-2.5 rounded-xl border border-line bg-canvas px-3 py-2 text-[13px] text-ink-faint transition-colors hover:border-ink/15 hover:text-ink-soft sm:flex sm:w-64"
      >
        <Search className="h-[15px] w-[15px]" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded-md border border-line bg-white px-1.5 py-0.5 text-[10.5px] font-medium">⌘K</kbd>
      </button>

      <button
        onClick={onOpenSearch}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-black/[0.04] sm:hidden"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-black/[0.04]">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            {recentActivity.length === 0 ? (
  <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
    <Bell className="mb-2 h-6 w-6 text-ink-faint" />
    <p className="text-sm font-medium text-ink">
      No recent activity
    </p>
    <p className="mt-1 text-xs text-ink-faint">
      Activity notifications will appear here once products are created,
      updated or published.
    </p>
  </div>
) : null}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/analytics" className="justify-center text-brand-600">View all activity</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="hidden sm:inline-flex">
            <Plus className="h-3.5 w-3.5" />
            Quick add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuTrigger asChild>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-glow sm:hidden">
            <Plus className="h-[18px] w-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Create new</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {quickAddItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="cursor-pointer">
                <item.icon className="h-4 w-4 text-ink-faint" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-0.5 flex items-center gap-2 rounded-xl p-1 pr-1 transition-colors hover:bg-black/[0.04] sm:pr-2.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop&crop=faces" alt="Aditi Rao" />
              <AvatarFallback>AR</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-[12.5px] font-medium leading-tight text-ink">Abhishek Jain</p>
              <p className="text-[11px] leading-tight text-ink-faint">Store Admin</p>
            </div>
          </button> 
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin-users"><User className="h-4 w-4 text-ink-faint" />Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings"><Settings className="h-4 w-4 text-ink-faint" />Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive asChild>
            <Link href="/logout"><LogOut className="h-4 w-4" />Logout</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
