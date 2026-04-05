import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-accent/55 bg-accent/60 text-accent-foreground",
        outline: "border-border/65 bg-background/72 text-muted-foreground",
        success: "border-emerald-500/18 bg-emerald-500/10 text-emerald-800",
        warning: "border-amber-500/18 bg-amber-500/10 text-amber-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
