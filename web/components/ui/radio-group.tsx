"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { cn } from "@/lib/utils";

// Gauge Dark RadioGroup.
// Item: small recessed well; checked, the gold control material takes over
// (gradient ring + rim + glow, mirroring the primary Button) with a dark
// indicator dot pressed into the gold face.

// Base UI className can be a state function; the wrappers feed it to cn(), so
// narrow it to a plain string (same treatment as the other ported files).
type WithClassName<P> = Omit<P, "className"> & { className?: string };

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  WithClassName<RadioGroupPrimitive.Props>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  WithClassName<RadioPrimitive.Root.Props>
>(({ className, ...props }, ref) => {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full",
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
    >
      <RadioPrimitive.Indicator data-slot="radio-group-indicator" className="size-full flex items-center justify-center">
        <span className="block h-1.5 w-1.5 rounded-full bg-primary-foreground shadow-[0_1px_0_oklch(1_0_0/0.25)]" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
