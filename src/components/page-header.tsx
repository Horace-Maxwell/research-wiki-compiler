import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

