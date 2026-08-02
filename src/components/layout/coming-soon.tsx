import { type LucideIcon, Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-1 text-[13px] text-ink-faint">{description}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-24 text-center shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-[15px] font-semibold text-ink">{title} module is on the way</h2>
        <p className="mt-1.5 max-w-sm text-[13px] text-ink-faint">
          This section is part of BlazeLine&apos;s roadmap and will be built in an upcoming step. The navigation and routing are already in place.
        </p>
      </div>
    </div>
  );
}
