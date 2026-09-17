"use client";

import * as React from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

// Gauge Dark Separator: a machined groove. Dark line with a faint highlight
// underneath so the cut reads as carved into the panel, not painted on.

const Separator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorPrimitive.Props, "className"> & {
    className?: string;
    /**
     * Accepted for API compatibility with the previous wrapper and ignored:
     * the Base UI separator is always semantic (role="separator").
     */
    decorative?: boolean;
  }
>(
  (
    { className, orientation = "horizontal", decorative: _decorative, ...props },
    ref
  ) => (
    <SeparatorPrimitive
      ref={ref}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal"
          ? "h-px w-full shadow-[0_1px_0_oklch(1_0_0/0.04)]"
          : "h-full w-px shadow-[1px_0_0_oklch(1_0_0/0.04)]",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
