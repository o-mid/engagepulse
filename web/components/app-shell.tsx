"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLineIcon } from "@/components/icons/chart-line";
import { DocumentSignedIcon } from "@/components/icons/document-signed";
import { PlayIcon } from "@/components/icons/play";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
} from "@/components/ui/sidebar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PRIMARY_NAV } from "@/lib/nav";
import { hostedApi, useApiHealth } from "@/lib/use-api-health";
import { cn } from "@/lib/utils";

const ICONS = {
  "/": PlayIcon,
  "/architecture": ChartLineIcon,
  "/contract": DocumentSignedIcon,
} as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const health = useApiHealth();
  const reduce = useReducedMotion();
  const status =
    health.online == null ? "idle" : health.online ? "online" : "offline";
  const hosted = hostedApi(health.upstream);
  const statusLabel =
    health.online == null
      ? "Probing Go service"
      : health.online
        ? hosted
          ? "Hosted Go API"
          : "Local Go API"
        : "Go service offline";

  return (
    <TooltipProvider>
      <Button
        asChild
        variant="secondary"
        size="sm"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        <a href="#main">Skip to content</a>
      </Button>
      <div className="flex h-svh overflow-hidden bg-background">
        <Sidebar className="hidden shrink-0 md:flex">
          <SidebarHeader>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              EngagePulse
            </p>
          </SidebarHeader>
          <SidebarContent>
            <nav aria-label="Primary">
              <SidebarGroup>
                {PRIMARY_NAV.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = ICONS[item.href];
                  return (
                    <SidebarItem
                      key={item.href}
                      asChild
                      label={item.label}
                      icon={<Icon className="size-4" />}
                      active={active}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                      />
                    </SidebarItem>
                  );
                })}
              </SidebarGroup>
            </nav>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-2 px-2.5 py-1">
              <StatusIndicator
                status={status}
                size="sm"
                pulse={status === "online" && !reduce}
              />
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 md:hidden">
            <p className="text-sm font-semibold text-foreground">EngagePulse</p>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={status}
                size="sm"
                pulse={status === "online" && !reduce}
              />
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
          </header>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </div>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid min-w-0 grid-cols-3">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.href];
            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-auto min-h-14 w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center text-[11px] font-medium leading-tight",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    active
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-secondary [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="max-w-full text-balance">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </TooltipProvider>
  );
}
