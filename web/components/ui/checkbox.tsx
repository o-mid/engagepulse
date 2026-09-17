"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Gauge Dark Checkbox.
// Unchecked: a tiny recessed well (same material as inputs).
// Checked: the machined gold button material scaled down: gradient fill,
// gold rim, top bevel + warm glow (--shadow-primary). One material system.

// Base UI className can be a state function; the wrapper feeds it to cn(), so
// narrow it to a plain string (same treatment as the other ported files).
type WithClassName<P> = Omit<P, "className"> & { className?: string };

const Checkbox = React.forwardRef<
  HTMLButtonElement,
  WithClassName<CheckboxPrimitive.Root.Props>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    data-slot="checkbox"
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-[var(--gauge-well-border)]",
      "bg-input shadow-[var(--shadow-well)]",
      "transition-all duration-150 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "data-disabled:cursor-not-allowed data-disabled:opacity-50",
      "data-checked:border-[var(--gauge-rim)]",
      "data-checked:bg-[linear-gradient(to_bottom,var(--gauge-grad-top),var(--gauge-grad-bottom))]",
      "data-checked:text-primary-foreground",
      "data-checked:shadow-[var(--shadow-primary)]",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      data-slot="checkbox-indicator"
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="size-full h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
