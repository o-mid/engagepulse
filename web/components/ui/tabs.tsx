"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

// Gauge Dark Tabs: a mode-selector bank. The list is a recessed well strip;
// the active tab is a raised charcoal plate (the secondary Button's material)
// sitting proud of the well, with its caption lit.

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<HTMLDivElement, TabsPrimitive.List.Props>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex min-h-10 min-w-0 flex-wrap items-center justify-start gap-1 rounded-lg border border-[var(--gauge-well-border)] bg-input p-1 text-muted-foreground shadow-[var(--shadow-well)] sm:justify-center",
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsPrimitive.Tab.Props>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Tab
      ref={ref}
      className={cn(
        "inline-flex min-w-0 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium sm:whitespace-nowrap",
        "transition-all duration-150 ease-out",
        "hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        "data-active:border data-active:border-border",
        "data-active:bg-secondary data-active:text-foreground",
        "data-active:shadow-[var(--shadow-raised)]",
        className
      )}
      {...props}
    />
  )
);
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  TabsPrimitive.Panel.Props
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Panel
    ref={ref}
    className={cn(
      "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
