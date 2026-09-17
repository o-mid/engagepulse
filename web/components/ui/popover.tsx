"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

// Gauge Dark Popover: floating layer, deepest shadow in the nested hierarchy.

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

// Base UI has no Anchor part (the trigger is the default anchor); passthrough
// keeps the export drop-in compatible.
const PopoverAnchor = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  Omit<PopoverPrimitive.Popup.Props, "className"> &
    Pick<
      PopoverPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    > & { className?: string }
>(
  (
    { className, align = "center", alignOffset, side, sideOffset = 6, ...props },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          ref={ref}
          data-slot="popover-content"
          className={cn(
            "z-50 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-[var(--shadow-pop)] outline-none",
            "transition-[transform,translate,scale,opacity] duration-150 data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
