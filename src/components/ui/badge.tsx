import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none",
  {
    variants: {
      variant: {
        default: "bg-black/[0.05] text-ink-soft",

        secondary: "bg-neutral-100 text-neutral-700",

        brand: "bg-brand-50 text-brand-600",

        success: "bg-success-bg text-success",

        warning: "bg-warning-bg text-warning",

        danger: "bg-danger-bg text-danger",

        info: "bg-info-bg text-info",

        outline: "border border-line text-ink-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({
  className,
  variant,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };