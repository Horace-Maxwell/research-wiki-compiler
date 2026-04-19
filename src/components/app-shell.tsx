"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BookText,
  BotMessageSquare,
  CircleHelp,
  ClipboardCheck,
  Compass,
  DatabaseZap,
  FileStack,
  FlaskConical,
  LayoutDashboard,
  LibraryBig,
  Radar,
  RefreshCw,
  SearchCheck,
  Settings2,
  Sparkles,
} from "lucide-react";

import { AppRouteLink } from "@/components/app-route-link";
import { useAppLocale } from "@/components/app-locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { APP_NAME, PRODUCT_SURFACE } from "@/lib/constants";
import {
  getProductSurfaceDetail,
  getProductSurfaceLabel,
} from "@/lib/app-locale";
import { cn } from "@/lib/utils";

const navIconMap = {
  "/topics": LibraryBig,
  "/questions": CircleHelp,
  "/gaps": SearchCheck,
  "/acquisition": SearchCheck,
  "/sessions": FlaskConical,
  "/syntheses": Sparkles,
  "/changes": RefreshCw,
  "/monitoring": Radar,
  "/onboarding": Compass,
  "/dashboard": LayoutDashboard,
  "/sources": FileStack,
  "/wiki": BookText,
  "/reviews": ClipboardCheck,
  "/ask": BotMessageSquare,
  "/audits": DatabaseZap,
  "/settings": Settings2,
} as const;

const navGroups = [
  {
    title: "Daily use",
    items: ["/topics", "/questions", "/sessions", "/syntheses"],
  },
  {
    title: "Signals",
    items: ["/gaps", "/changes"],
  },
  {
    title: "Operations",
    items: ["/acquisition", "/monitoring"],
  },
  {
    title: "Workspace",
    items: ["/dashboard", "/onboarding"],
  },
  {
    title: "Knowledge",
    items: ["/wiki", "/sources", "/reviews"],
  },
  {
    title: "Answers",
    items: ["/ask", "/audits"],
  },
  {
    title: "System",
    items: ["/settings"],
  },
] as const;

const desktopSidebarBasePaths = ["/dashboard", "/topics", "/questions", "/sessions", "/syntheses"] as const;

function normalizeActivePath(pathname: string) {
  if (pathname.startsWith("/topics/")) {
    return "/topics";
  }

  if (pathname.startsWith("/examples/")) {
    return "/topics";
  }

  if (pathname.startsWith("/questions")) {
    return "/questions";
  }

  if (pathname.startsWith("/gaps")) {
    return "/gaps";
  }

  if (pathname.startsWith("/acquisition")) {
    return "/acquisition";
  }

  if (pathname.startsWith("/sessions")) {
    return "/sessions";
  }

  if (pathname.startsWith("/syntheses")) {
    return "/syntheses";
  }

  if (pathname.startsWith("/changes")) {
    return "/changes";
  }

  if (pathname.startsWith("/monitoring")) {
    return "/monitoring";
  }

  const match = PRODUCT_SURFACE.find((item) => pathname === item.href);

  return match?.href ?? "/dashboard";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { locale, copy } = useAppLocale();
  const isExampleRoute = pathname.startsWith("/examples/");
  const isDashboardRoute = pathname === "/dashboard";
  const isTopicsIndexRoute = pathname === "/topics";
  const useExpandedDashboardLayout = isDashboardRoute;
  const isTopicDetailRoute = pathname.startsWith("/topics/");
  const activePath = normalizeActivePath(pathname);
  const isSettingsActive = activePath === "/settings";
  const useSingleFocusSidebar =
    isTopicDetailRoute || isDashboardRoute || isSettingsActive || isTopicsIndexRoute;
  const primaryPaths = navGroups[0].items;
  const supportingGroups = navGroups.slice(1, 4);
  const desktopSidebarPaths = desktopSidebarBasePaths.includes(
    activePath as (typeof desktopSidebarBasePaths)[number],
  )
    ? [...desktopSidebarBasePaths]
    : activePath === "/settings"
      ? [...desktopSidebarBasePaths]
      : [...desktopSidebarBasePaths, activePath];
  const currentSurface = isExampleRoute
    ? {
        label: copy.shell.showcaseLabel,
        detail: copy.shell.showcaseDetail,
      }
      : isTopicDetailRoute
      ? {
          label: copy.shell.topicLabel,
          detail: "",
        }
      : {
          label: getProductSurfaceLabel(locale, activePath),
          detail: getProductSurfaceDetail(locale, activePath),
        };
  const showShellDescription = false;
  const headerEyebrow = useSingleFocusSidebar
    ? isExampleRoute
      ? copy.shell.headerShowcase
      : isDashboardRoute
        ? copy.shell.headerDashboard
        : isSettingsActive
          ? copy.settings.eyebrow
        : copy.shell.headerTopic
    : APP_NAME;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(247,245,240,0.97),rgba(243,241,236,1))]">
      <div
        className={cn(
          "mx-auto flex min-h-screen max-w-[1920px]",
          useExpandedDashboardLayout
            ? "gap-4 px-3 py-3 lg:px-4 xl:px-5 2xl:px-6"
            : "gap-5 px-4 py-4 lg:px-6 xl:px-8 2xl:px-10",
        )}
      >
        <aside
          className={cn(
            "hidden shrink-0 lg:flex",
            useExpandedDashboardLayout
              ? "w-[196px]"
              : useSingleFocusSidebar
                ? "w-[212px]"
                : "w-[228px]",
          )}
        >
          <div
            className={cn(
              "sticky w-full self-start border border-border/60 bg-sidebar/88 shadow-[0_18px_56px_-44px_rgba(15,23,42,0.18)] backdrop-blur-[4px]",
              useExpandedDashboardLayout
                ? "rounded-[28px] px-4 py-4"
                : "rounded-[30px] px-5 py-5",
              useSingleFocusSidebar ? "top-5" : "top-4",
            )}
          >
              <div className="space-y-1 px-1">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {APP_NAME}
                </div>
              {useSingleFocusSidebar ? (
                <div className="text-[18px] font-semibold tracking-tight text-foreground">
                  {isDashboardRoute
                    ? copy.shell.focusWorkspace
                    : isSettingsActive
                      ? copy.settings.eyebrow
                    : copy.shell.focusTopic}
                </div>
              ) : null}
            </div>

            <nav className="mt-5 space-y-1 border-l border-border/55 pl-3">
              {desktopSidebarPaths.map((href) => {
                const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                if (!item) {
                  return null;
                }

                const Icon = navIconMap[item.href];
                const active = activePath === item.href;
                const label = getProductSurfaceLabel(locale, item.href);

                return (
                  <AppRouteLink
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-r-full px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-background/82 text-foreground shadow-[0_8px_24px_-24px_rgba(15,23,42,0.18)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "")} />
                    <div className="min-w-0 truncate font-medium">{label}</div>
                  </AppRouteLink>
                );
              })}
            </nav>

            <div className="mt-6 space-y-3 border-t border-border/55 pt-4">
              {!isSettingsActive && !useExpandedDashboardLayout && !isTopicsIndexRoute ? (
                <LanguageSwitcher />
              ) : null}
              <AppRouteLink
                href="/settings"
                className={cn(
                  "flex items-center gap-2 border text-sm transition-colors",
                  useExpandedDashboardLayout
                    ? "rounded-[16px] px-3.5 py-2.5 shadow-[0_14px_32px_-30px_rgba(15,23,42,0.2)]"
                    : "rounded-full px-3 py-2",
                  isSettingsActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background/88 text-muted-foreground hover:border-foreground/10 hover:text-foreground",
                )}
              >
                <Settings2 className="size-4 shrink-0" />
                <span className="font-medium">{getProductSurfaceLabel(locale, "/settings")}</span>
              </AppRouteLink>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "border border-border/60 bg-background/90 shadow-[0_24px_72px_-56px_rgba(15,23,42,0.2)] backdrop-blur-[4px]",
              useExpandedDashboardLayout
                ? "min-h-[calc(100dvh-1.5rem)] rounded-[30px]"
                : "min-h-screen rounded-[32px]",
            )}
          >
            <header
              className={cn(
                "border-b border-border/60",
                useExpandedDashboardLayout
                  ? "px-4 py-3 lg:px-5"
                  : "px-5 lg:px-7",
                !useExpandedDashboardLayout && (useSingleFocusSidebar ? "py-3" : "py-4"),
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className={cn("space-y-1", useSingleFocusSidebar && "space-y-0.5")}>
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {headerEyebrow}
                  </div>
                  {!useSingleFocusSidebar ? (
                    <div className="text-base font-medium text-foreground">
                      {currentSurface?.label ?? copy.shell.fallbackSurfaceLabel}
                    </div>
                  ) : null}
                  {showShellDescription ? (
                    <div className="text-sm leading-6 text-muted-foreground">
                      {currentSurface?.detail ?? copy.shell.fallbackSurfaceDetail}
                    </div>
                  ) : null}
                </div>
                {!isSettingsActive ? <LanguageSwitcher compact /> : null}
              </div>

              <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {primaryPaths.map((href) => {
                  const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                  if (!item) {
                    return null;
                  }

                  const Icon = navIconMap[item.href];
                  const active = activePath === item.href;
                  const label = getProductSurfaceLabel(locale, item.href);

                  return (
                    <AppRouteLink
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background/80 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </AppRouteLink>
                  );
                })}
              </nav>

              <div className="mt-3 space-y-2 lg:hidden">
                {supportingGroups.map((group) => (
                  <div key={group.title}>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((href) => {
                        const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                        if (!item) {
                          return null;
                        }

                        const Icon = navIconMap[item.href];
                        const active = activePath === item.href;
                        const label = getProductSurfaceLabel(locale, item.href);

                        return (
                          <AppRouteLink
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                              active
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background/80 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Icon className="size-3.5" />
                            {label}
                          </AppRouteLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <nav className="mt-3 flex flex-wrap gap-2 lg:hidden">
                {["/wiki", "/sources", "/reviews", "/ask", "/audits", "/settings"].map((href) => {
                  const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                  if (!item) {
                    return null;
                  }

                  const Icon = navIconMap[item.href];
                  const active = activePath === item.href;
                  const label = getProductSurfaceLabel(locale, item.href);

                  return (
                    <AppRouteLink
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background/80 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </AppRouteLink>
                  );
                })}
              </nav>
            </header>

            <main
              className={cn(
                useExpandedDashboardLayout
                  ? "px-4 py-5 lg:px-5 lg:py-6 xl:px-6"
                  : "px-5 py-6 lg:px-7 lg:py-7",
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
