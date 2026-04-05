"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookText,
  BotMessageSquare,
  ClipboardCheck,
  Compass,
  DatabaseZap,
  FileStack,
  LayoutDashboard,
  Settings2,
} from "lucide-react";

import { APP_NAME, PRODUCT_SURFACE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navIconMap = {
  "/onboarding": Compass,
  "/dashboard": LayoutDashboard,
  "/sources": FileStack,
  "/wiki": BookText,
  "/reviews": ClipboardCheck,
  "/ask": BotMessageSquare,
  "/audits": DatabaseZap,
  "/settings": Settings2,
} as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(210,166,79,0.14),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.8),_rgba(255,248,236,0.98))]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-border/80 bg-sidebar/90 p-5 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.6)] backdrop-blur lg:flex lg:flex-col">
          <div className="space-y-3">
            <Badge variant="success">MVP ready</Badge>
            <div>
              <h1 className="font-sans text-xl font-semibold tracking-tight">{APP_NAME}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Local-first workspace, compiled wiki mutation, wiki-first answering, and audit
                inspection.
              </p>
            </div>
          </div>
          <Separator className="my-5" />
          <nav className="space-y-1.5">
            {PRODUCT_SURFACE.map((item) => {
              const Icon = navIconMap[item.href];
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-border/80 bg-card/80 p-4 text-sm text-muted-foreground">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
              Product shape
            </div>
            <p className="mt-2 leading-6">
              Workspace init, the file-backed wiki, visible source summaries, reviewable patch
              apply, wiki-first Ask, answer archive, and audit inspection are live.
            </p>
          </div>
        </aside>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col rounded-[28px] border border-border/80 bg-background/90 shadow-[0_18px_70px_-36px_rgba(15,23,42,0.55)] backdrop-blur">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 px-5 py-4 lg:px-8">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Research Wiki Compiler
              </div>
            <div className="mt-1 text-base font-medium text-foreground">
              Compiled knowledge should stay visible, reviewable, and local.
            </div>
          </div>
          <Badge variant="outline">Local-first MVP</Badge>
          </header>
          <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
