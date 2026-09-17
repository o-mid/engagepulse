"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

// Gauge Dark Switch.
// Track: recessed well (inputs' material). Checked track: the machined gold
// gradient + rim + glow, exactly the primary Button's surface scaled down.
// Thumb: raised charcoal plate riding inside the well.

// Base UI className can be a state function; the wrapper feeds it to cn(), so
// narrow it to a plain string (same treatment as the other ported files).
type WithClassName<P> = Omit<P, "className"> & { className?: string };

const Switch = React.forwardRef<
  HTMLButtonElement,
  WithClassName<SwitchPrimitive.Root.Props>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
      "border border-[var(--gauge-well-border)] bg-input shadow-[var(--shadow-well)]",
      "transition-all duration-150 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "data-disabled:cursor-not-allowed data-disabled:opacity-50",
      "data-checked:border-[var(--gauge-rim)]",
      "data-checked:bg-[linear-gradient(to_bottom,var(--gauge-grad-top),var(--gauge-grad-bottom))]",
      "data-checked:shadow-[var(--shadow-primary)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full",
        "border border-border bg-secondary shadow-[var(--shadow-raised)]",
        "transition-transform duration-150 ease-out",
        "data-checked:translate-x-4 data-checked:border-[var(--gauge-rim)] data-checked:bg-[oklch(0.97_0.02_88)]",
        "data-unchecked:translate-x-0.5"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
