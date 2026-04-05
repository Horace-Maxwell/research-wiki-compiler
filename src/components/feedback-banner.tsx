import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type FeedbackBannerProps = {
  variant: "error" | "success" | "info";
  children: ReactNode;
};

const variantClassMap = {
  error: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
  info: "border-border/70 bg-background/60 text-foreground",
} as const;

const iconMap = {
  error: AlertTriangle,
  success: CheckCircle2,
  info: Info,
} as const;

export function FeedbackBanner({ variant, children }: FeedbackBannerProps) {
  const Icon = iconMap[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        variantClassMap[variant],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
