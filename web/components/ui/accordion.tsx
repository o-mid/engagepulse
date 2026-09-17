"use client";

import * as React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Gauge Dark Accordion: rows divided by machined grooves (dark line + faint
// highlight). The open trigger lights its caption gold like an active gauge.

const Accordion = AccordionPrimitive.Root;

// Base UI className can be a state function; the wrappers feed it to cn(), so
// narrow it to a plain string (same treatment as the other ported files).
type WithClassName<P> = Omit<P, "className"> & { className?: string };

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  WithClassName<AccordionPrimitive.Item.Props>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "border-b border-border shadow-[0_1px_0_oklch(1_0_0/0.03)] last:border-b-0 last:shadow-none",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  WithClassName<AccordionPrimitive.Trigger.Props>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium text-foreground",
        "rounded-md transition-colors duration-150 ease-out",
        "hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "data-panel-open:text-primary",
        "[&[data-panel-open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  WithClassName<AccordionPrimitive.Panel.Props>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Panel
    ref={ref}
    className="h-[var(--accordion-panel-height)] overflow-hidden text-sm text-muted-foreground transition-[height] duration-200 ease-out data-starting-style:h-0 data-ending-style:h-0"
    {...props}
  >
    <div className={cn("pb-4 pt-0 leading-relaxed", className)}>{children}</div>
  </AccordionPrimitive.Panel>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
