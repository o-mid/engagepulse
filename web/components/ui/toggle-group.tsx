"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "./toggle";

// Gauge Dark ToggleGroup: a selector switch bank. The group is a recessed
// well strip; the active option is a raised charcoal plate sitting proud of
// the well, exactly the secondary Button's material.

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  ToggleGroupPrimitive.Props & VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive
    ref={ref}
    className={cn(
      "flex items-center gap-1 rounded-lg border border-[var(--gauge-well-border)] bg-input p-1 shadow-[var(--shadow-well)]",
      className
    )}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive>
));
ToggleGroup.displayName = "ToggleGroup";

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  TogglePrimitive.Props & VariantProps<typeof toggleVariants>
>(({ className, children, variant: _variant, size: _size, ...props }, ref) => {
  return (
    <TogglePrimitive
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium",
        "text-muted-foreground transition-all duration-150 ease-out",
        "hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-pressed:border data-pressed:border-border",
        "data-pressed:bg-secondary data-pressed:text-foreground",
        "data-pressed:shadow-[var(--shadow-raised)]",
        className
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
});
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
