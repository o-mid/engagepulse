import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Gauge Dark Toast: a floating readout panel on the deepest shadow layer.

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  HTMLDivElement,
  ToastPrimitive.Viewport.Props
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Portal>
    <ToastPrimitive.Viewport
      ref={ref}
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
      {...props}
    />
  </ToastPrimitive.Portal>
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-[var(--shadow-pop)] transition-all data-swiping:translate-x-[var(--toast-swipe-movement-x)] data-swiping:transition-none data-ending-style:opacity-80 data-ending-style:translate-x-full data-starting-style:-translate-y-full sm:data-starting-style:translate-y-full",
  {
    variants: {
      variant: {
        default: "border-border bg-popover text-popover-foreground",
        destructive:
          "destructive group border-destructive/50 bg-popover text-[oklch(0.78_0.14_25)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef<
  HTMLDivElement,
  ToastPrimitive.Root.Props & VariantProps<typeof toastVariants>
>(({ className, variant, swipeDirection = "right", ...props }, ref) => {
  return (
    <ToastPrimitive.Root
      ref={ref}
      swipeDirection={swipeDirection}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef<
  HTMLButtonElement,
  ToastPrimitive.Action.Props
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground shadow-[var(--shadow-raised)] transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-destructive/40 group-[.destructive]:hover:border-destructive/60 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef<
  HTMLButtonElement,
  ToastPrimitive.Close.Props
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/60 group-hover:opacity-100 group-[.destructive]:text-[oklch(0.72_0.16_25)] group-[.destructive]:hover:text-[oklch(0.85_0.1_25)] group-[.destructive]:focus:ring-destructive",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef<
  HTMLHeadingElement,
  ToastPrimitive.Title.Props
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  ToastPrimitive.Description.Props
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
