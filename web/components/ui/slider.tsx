"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

// Gauge Dark Slider.
// Track: recessed well (same material as inputs). Range: the machined gold
// gradient with its top bevel, the primary Button's fill laid into the well.
// Thumb: gold-rimmed raised cap sharing the button's bevel + glow.

const Slider = React.forwardRef<HTMLDivElement, SliderPrimitive.Root.Props>(
  ({ className, defaultValue, value, min = 0, max = 100, ...props }, ref) => {
    const _values = Array.isArray(value)
      ? value
      : Array.isArray(defaultValue)
        ? defaultValue
        : [min, max]

    return (
      <SliderPrimitive.Root
        data-slot="slider"
        ref={ref}
        thumbAlignment="edge"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        className={cn("relative w-full", className)}
        {...props}
      >
        <SliderPrimitive.Control className="relative flex w-full touch-none select-none items-center">
          <SliderPrimitive.Track data-slot="slider-track" className="relative h-2 w-full grow overflow-hidden rounded-full border border-[var(--gauge-well-border)] bg-input shadow-[var(--shadow-well)]">
            <SliderPrimitive.Indicator data-slot="slider-range" className="absolute h-full bg-[linear-gradient(to_bottom,var(--gauge-grad-top),var(--gauge-grad-bottom))] shadow-[inset_0_1px_0_oklch(1_0_0/0.35)]" />
          </SliderPrimitive.Track>
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              data-slot="slider-thumb" key={index}
              className={cn(
                "block h-4 w-4 rounded-full",
                "border border-[var(--gauge-rim)]",
                "bg-[linear-gradient(to_bottom,oklch(0.97_0.02_88),var(--gauge-grad-top))]",
                "shadow-[var(--shadow-primary)]",
                "transition-shadow duration-150 ease-out",
                "focus-visible:outline-none focus-visible:shadow-[var(--shadow-primary),var(--shadow-focus)]",
                "data-disabled:pointer-events-none data-disabled:opacity-50"
              )}
            />
          ))}
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    )
  }
)
Slider.displayName = "Slider";

export { Slider };
