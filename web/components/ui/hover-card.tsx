"use client";

import * as React from "react";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";

import { cn } from "@/lib/utils";

// Gauge Dark HoverCard: floating layer, --shadow-pop.

const HoverCard = PreviewCardPrimitive.Root;
const HoverCardTrigger = PreviewCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  HTMLDivElement,
  PreviewCardPrimitive.Popup.Props &
    Pick<
      PreviewCardPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>(
  (
    { className, align = "center", alignOffset, side, sideOffset = 6, ...props },
    ref
  ) => (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          ref={ref}
          data-slot="hover-card-content"
          className={cn(
            "z-50 w-64 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-[var(--shadow-pop)] outline-none",
            "transition-[transform,translate,scale,opacity] duration-150 data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2",
            className
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };
