"use client";

import { useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
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

const ICONS = {
  "/": PlayIcon,
  "/architecture": ChartLineIcon,
  "/contract": DocumentSignedIcon,
} as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const health = useApiHealth();
  const reduce = useReducedMotion();
  const status =
    health.online == null ? "idle" : health.online ? "online" : "offline";
  const hosted = hostedApi(health.upstream);

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
        <Sidebar className="hidden shrink-0 md:flex" aria-label="Primary">
          <SidebarHeader>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              EngagePulse
            </p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              {PRIMARY_NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = ICONS[item.href];
                return (
                  <SidebarItem
                    key={item.href}
                    label={item.label}
                    icon={<Icon className="size-4" />}
                    active={active}
                    aria-current={active ? "page" : undefined}
                    onClick={() => router.push(item.href)}
                  />
                );
              })}
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-2 px-2.5 py-1">
              <StatusIndicator
                status={status}
                size="sm"
                pulse={status === "online" && !reduce}
              />
              <p className="text-xs text-muted-foreground">
                {health.online == null
                  ? "Probing Go service"
                  : health.online
                    ? hosted
                      ? "Hosted Go API"
                      : "Local Go API"
                    : "Go service offline"}
              </p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 md:hidden">
            <p className="text-sm font-semibold text-foreground">EngagePulse</p>
            <nav aria-label="Primary" className="flex gap-1">
              {PRIMARY_NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = ICONS[item.href];
                return (
                  <SidebarItem
                    key={item.href}
                    label={item.label}
                    icon={<Icon className="size-4" />}
                    active={active}
                    collapsed
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => router.push(item.href)}
                    className="w-auto"
                  />
                );
              })}
            </nav>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
