"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

// Gauge Dark Progress: a level meter. The track is a recessed well; the fill
// is the machined gold material with its top bevel, laid into the well.

const Progress = React.forwardRef<
  HTMLDivElement,
  Omit<ProgressPrimitive.Root.Props, "value"> & {
    value?: ProgressPrimitive.Root.Props["value"];
  }
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value ?? null}
    className={cn(
      "relative h-2.5 w-full overflow-hidden rounded-full border border-[var(--gauge-well-border)] bg-input shadow-[var(--shadow-well)]",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Track className="h-full w-full">
      <ProgressPrimitive.Indicator className="h-full w-full flex-1 rounded-full bg-[linear-gradient(to_bottom,var(--gauge-grad-top),var(--gauge-grad-bottom))] shadow-[inset_0_1px_0_oklch(1_0_0/0.35)] transition-all duration-300 ease-out" />
    </ProgressPrimitive.Track>
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

export { Progress };
