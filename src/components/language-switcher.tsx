"use client";

import { Languages } from "lucide-react";

import { useAppLocale } from "@/components/app-locale-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale, setLocale, copy } = useAppLocale();

  return (
    <div
      className={cn(
        "rounded-[20px] border border-border/60 bg-background/70 p-3 shadow-[0_10px_28px_-26px_rgba(15,23,42,0.2)]",
        compact && "rounded-full px-2.5 py-2",
        className,
      )}
    >
      <div className={cn("flex items-center gap-3", compact && "gap-2")}>
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-muted-foreground" />
          {!compact ? (
            <div className="space-y-0.5">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {copy.language.label}
              </div>
              <div className="text-xs text-muted-foreground">{copy.language.description}</div>
            </div>
          ) : null}
        </div>
        <div
          aria-label={copy.language.settingsTitle}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1"
          role="group"
        >
          <button
            aria-pressed={locale === "en"}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              locale === "en"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setLocale("en")}
            type="button"
          >
            {copy.language.english}
          </button>
          <button
            aria-pressed={locale === "zh"}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              locale === "zh"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setLocale("zh")}
            type="button"
          >
            {copy.language.chinese}
          </button>
        </div>
      </div>
    </div>
  );
}
