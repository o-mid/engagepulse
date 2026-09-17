"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { formFieldBase, formFieldSingleLine } from "./_shared";

// Gauge Dark Select. Trigger is a recessed well (the form-field material,
// shared with Input via formFieldBase); the open list floats with the
// deepest shadow in the nested hierarchy.

// Base UI className can be a state function; the wrappers feed it to cn(), so
// narrow it to a plain string.
type WithClassName<P> = Omit<P, "className"> & { className?: string };

const popSurface =
  "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-[var(--shadow-pop)]";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  ...props
}: WithClassName<SelectPrimitive.Trigger.Props>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        formFieldBase,
        formFieldSingleLine,
        "items-center justify-between",
        "focus:outline-none focus:border-[var(--gauge-rim)] focus:shadow-[var(--shadow-well),var(--shadow-focus)]",
        "[&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  );
}
SelectTrigger.displayName = "SelectTrigger";

function SelectScrollUpButton({
  className,
  ...props
}: WithClassName<SelectPrimitive.ScrollUpArrow.Props>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      className={cn(
        "top-0 w-full flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}
SelectScrollUpButton.displayName = "SelectScrollUpButton";

function SelectScrollDownButton({
  className,
  ...props
}: WithClassName<SelectPrimitive.ScrollDownArrow.Props>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      className={cn(
        "bottom-0 w-full flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}
SelectScrollDownButton.displayName = "SelectScrollDownButton";

function SelectContent({
  className,
  children,
  side,
  sideOffset,
  align,
  alignOffset,
  alignItemWithTrigger = false,
  ...props
}: WithClassName<SelectPrimitive.Popup.Props> &
  Pick<
    SelectPrimitive.Positioner.Props,
    "side" | "sideOffset" | "align" | "alignOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
      >
        <SelectPrimitive.Popup
          className={cn(
            popSurface,
            "relative max-h-96",
            "transition-[transform,scale,opacity] duration-150 data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95",
            !alignItemWithTrigger &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List
            className={cn(
              "p-1",
              !alignItemWithTrigger &&
                "max-h-[var(--available-height)] w-full min-w-[var(--anchor-width)] overflow-y-auto"
            )}
          >
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}
SelectContent.displayName = "SelectContent";

function SelectLabel({
  className,
  ...props
}: WithClassName<SelectPrimitive.GroupLabel.Props>) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn(
        "px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
SelectLabel.displayName = "SelectLabel";

function SelectItem({
  className,
  children,
  ...props
}: WithClassName<SelectPrimitive.Item.Props>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-2 pr-8 text-sm outline-none transition-colors",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
SelectItem.displayName = "SelectItem";

function SelectSeparator({
  className,
  ...props
}: WithClassName<SelectPrimitive.Separator.Props>) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
SelectSeparator.displayName = "SelectSeparator";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
