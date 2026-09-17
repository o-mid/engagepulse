import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Gauge Dark Button.
// Hero (default): machined gold control. Vertical gold gradient, darker gold
// rim, bright top bevel + dark base bevel (--shadow-primary), warm glow.
// Secondary: raised charcoal plate one level above the panel (--shadow-raised).
// Pressing collapses the bevel into a well: depth is the interaction language.

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium select-none",
    "rounded-lg transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Machined gold: the DS's signature material.
        default:
          "border border-[var(--gauge-rim)] text-primary-foreground " +
          "bg-[linear-gradient(to_bottom,var(--gauge-grad-top),var(--gauge-grad-bottom))] " +
          "shadow-[var(--shadow-primary)] " +
          "hover:brightness-[1.06] " +
          "active:brightness-[0.96] active:shadow-[inset_0_1px_3px_oklch(0_0_0/0.35),0_1px_0_oklch(1_0_0/0.06)]",
        // Raised charcoal plate.
        secondary:
          "border border-border bg-secondary text-secondary-foreground " +
          "shadow-[var(--shadow-raised)] " +
          "hover:bg-accent hover:text-accent-foreground " +
          "active:shadow-[var(--shadow-well)] active:bg-muted",
        // Hairline only: sits flush with the panel.
        outline:
          "border border-border bg-transparent text-foreground " +
          "hover:bg-secondary hover:shadow-[var(--shadow-raised)] " +
          "active:shadow-[var(--shadow-well)]",
        // No surface at all.
        ghost:
          "bg-transparent text-muted-foreground " +
          "hover:bg-secondary hover:text-foreground",
        // Alarm control: same machined treatment in the destructive hue.
        destructive:
          "border border-[oklch(0.45_0.16_25)] bg-destructive text-destructive-foreground " +
          "shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_1px_2px_oklch(0_0_0/0.5),0_3px_10px_-2px_oklch(0.55_0.19_25/0.3)] " +
          "hover:brightness-110 active:brightness-95",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<ButtonPrimitive.Props, "className">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Callers written against the Radix API pass the element to become as a
    // child: <Button asChild><Link>…</Link></Button>. Base UI has no asChild,
    // it composes through `render`. Without this the prop reaches the DOM and
    // the anchor nests inside the button instead of replacing it, which stacks
    // the icon above the label and puts a link inside a button.
    if (asChild && React.isValidElement(props.children)) {
      const { children, ...rest } = props
      return (
        <ButtonPrimitive
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...rest}
          // After the spread, so an explicit asChild child wins over a stray
          // render prop rather than being silently replaced by it.
          // SAFETY: this branch runs only when `asChild` is set, and the caller then
          // owns passing a single element for the slot to clone.
          render={children as React.ReactElement}
        />
      );
    }

    return (
      <ButtonPrimitive
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
