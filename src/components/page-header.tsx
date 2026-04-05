import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  compact?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  compact = false,
}: PageHeaderProps) {
  return (
    <div className={compact ? "space-y-2.5" : "space-y-4"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className={compact ? "space-y-2" : "space-y-3"}>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className={
                compact
                  ? "text-[clamp(1.62rem,0.95vw+1.18rem,2.18rem)] font-semibold tracking-[-0.04em] text-foreground"
                  : "text-[clamp(2rem,1.8vw+1.05rem,2.85rem)] font-semibold tracking-[-0.04em] text-foreground"
              }
            >
              {title}
            </h2>
            {badge ? <Badge variant="outline">{badge}</Badge> : null}
          </div>
        </div>
        {actions}
      </div>
      <p
        className={
          compact
            ? "max-w-[68ch] text-[14.5px] leading-[1.8] text-muted-foreground"
            : "max-w-[70ch] text-[15px] leading-[1.82] text-muted-foreground"
        }
      >
        {description}
      </p>
    </div>
  );
}
