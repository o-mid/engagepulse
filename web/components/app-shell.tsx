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
      <div className="flex min-h-svh bg-background">
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-16 md:pb-0">
          <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 md:hidden">
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
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-3">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.href];
            return (
              <li key={item.href}>
                <Button
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "h-14 w-full flex-col gap-1 rounded-none text-xs",
                    active && "text-primary",
                  )}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </TooltipProvider>
  );
}
