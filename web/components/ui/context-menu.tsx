"use client";

import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

// Gauge Dark ContextMenu: floating layer on the deepest shadow, items share
// the dropdown's accent-hover treatment so all menus read as one system.

// Base UI className can be a state function; the wrappers feed it to cn(), so
// narrow it to a plain string.
type WithClassName<P> = Omit<P, "className"> & { className?: string };

const popSurface =
  "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-pop)]";

const popAnimation =
  "transition-[transform,translate,scale,opacity] duration-150 data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.SubmenuRoot;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: WithClassName<ContextMenuPrimitive.SubmenuTrigger.Props> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      className={cn(
        "flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
}
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

function ContextMenuSubContent({
  className,
  align = "start",
  alignOffset = 4,
  side = "right",
  sideOffset = 0,
  ...props
}: WithClassName<ContextMenuPrimitive.Popup.Props> &
  Pick<
    ContextMenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          className={cn(popSurface, popAnimation, className)}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}
ContextMenuSubContent.displayName = "ContextMenuSubContent";

function ContextMenuContent({
  className,
  ...props
}: WithClassName<ContextMenuPrimitive.Popup.Props>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner className="isolate z-50 outline-none">
        <ContextMenuPrimitive.Popup
          className={cn(popSurface, popAnimation, className)}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}
ContextMenuContent.displayName = "ContextMenuContent";

function ContextMenuItem({
  className,
  inset,
  ...props
}: WithClassName<ContextMenuPrimitive.Item.Props> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
}
ContextMenuItem.displayName = "ContextMenuItem";

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: WithClassName<ContextMenuPrimitive.CheckboxItem.Props>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: WithClassName<ContextMenuPrimitive.RadioItem.Props>) {
  return (
    <ContextMenuPrimitive.RadioItem
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.RadioItemIndicator>
          <Circle className="h-2 w-2 fill-primary text-primary" />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

function ContextMenuLabel({
  className,
  inset,
  ...props
}: WithClassName<ContextMenuPrimitive.GroupLabel.Props> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.GroupLabel
      className={cn(
        "px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
}
ContextMenuLabel.displayName = "ContextMenuLabel";

function ContextMenuSeparator({
  className,
  ...props
}: WithClassName<ContextMenuPrimitive.Separator.Props>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
ContextMenuSeparator.displayName = "ContextMenuSeparator";

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto font-mono text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
