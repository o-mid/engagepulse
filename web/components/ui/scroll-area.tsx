"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

// Gauge Dark ScrollArea: thumb is a small raised bar riding the panel edge.

// Base UI className can be a state function; the wrappers feed it to cn(), so
// narrow it to a plain string (same treatment as the other ported files).
type WithClassName<P> = Omit<P, "className"> & { className?: string };

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  WithClassName<ScrollAreaPrimitive.Root.Props>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    data-slot="scroll-area"
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="h-full w-full rounded-[inherit]">
      <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  WithClassName<ScrollAreaPrimitive.Scrollbar.Props>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    data-slot="scroll-area-scrollbar"
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-px",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-px",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb
      data-slot="scroll-area-thumb"
      className={cn(
        "relative rounded-full bg-[var(--gauge-well-border)] shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] hover:bg-border",
        orientation === "vertical" && "flex-1"
      )}
    />
  </ScrollAreaPrimitive.Scrollbar>
));
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
