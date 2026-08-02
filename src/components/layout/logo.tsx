import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center", className)}>
      <div className="absolute inset-0 rounded-[9px] bg-gradient-to-br from-brand-400 to-brand-600 animate-flame-pulse" />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative h-4 w-4 text-white"
      >
        <path
          d="M12 2C12 2 7 7.5 7 12.5C7 15.5376 9.23858 18 12 18C14.7614 18 17 15.5376 17 12.5C17 11.3 16.5 10 16.5 10C16.5 10 15.5 11.5 14.5 11.5C14.5 11.5 15 9 12 5.5C12 5.5 12.5 8 10.5 9.5C9 10.6 8.5 12 8.5 13"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.5 14.5C10.5 15.8807 11.1193 17 12.3 17C13.4807 17 14 15.8807 14 14.5C14 13.5 13.3 12.8 13.3 12.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && (
        <span className="text-[15px] font-semibold tracking-[-0.015em] text-ink">
          BlazeLine
        </span>
      )}
    </div>
  );
}
