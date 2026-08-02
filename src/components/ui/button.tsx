import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-brand-500 text-white shadow-glow hover:bg-brand-600",
        secondary:
          "bg-white text-ink border border-line hover:border-ink/20 hover:bg-black/[0.02] shadow-card",
        ghost:
          "text-ink-soft hover:bg-black/[0.04] hover:text-ink",
        outline:
          "border border-line bg-transparent hover:bg-black/[0.03] text-ink",
        destructive:
          "bg-danger text-white hover:bg-danger/90",
        link: "text-brand-600 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[12.5px]",
        lg: "h-11 px-5 text-sm",
        icon: "h-10 w-10 shrink-0",
        "icon-sm": "h-8 w-8 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
