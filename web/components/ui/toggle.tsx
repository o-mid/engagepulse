"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Gauge Dark Toggle: a latching hardware button. Off it sits flush with the
// panel; on it latches DOWN into a recessed well with the gold legend lit.

const toggleVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
    "transition-all duration-150 ease-out",
    "hover:bg-secondary hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-pressed:border data-pressed:border-[var(--gauge-well-border)]",
    "data-pressed:bg-input data-pressed:text-primary",
    "data-pressed:shadow-[var(--shadow-well)]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-transparent text-muted-foreground",
        outline:
          "border border-border bg-transparent text-foreground shadow-[var(--shadow-raised)] hover:bg-secondary data-pressed:shadow-[var(--shadow-well)]",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2.5",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Toggle = React.forwardRef<
  HTMLButtonElement,
  TogglePrimitive.Props & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
