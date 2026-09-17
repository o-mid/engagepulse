"use client";

import * as React from "react";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

// Gauge Dark Menubar: the bar is a raised control strip one level above the
// panel; open menus float on the deepest shadow layer.

const popSurface =
  "z-50 min-w-[12rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-pop)]";

const popAnimation =
  "transition-[transform,translate,scale,opacity] duration-150 data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2";

const MenubarMenu = MenuPrimitive.Root;

const MenubarGroup = MenuPrimitive.Group;

const MenubarPortal = MenuPrimitive.Portal;

const MenubarSub = MenuPrimitive.SubmenuRoot;

const MenubarRadioGroup = MenuPrimitive.RadioGroup;

const Menubar = React.forwardRef<HTMLDivElement, MenubarPrimitive.Props>(
  ({ className, ...props }, ref) => (
    <MenubarPrimitive
      ref={ref}
      className={cn(
        "flex h-10 items-center space-x-1 rounded-lg border border-border bg-secondary p-1 shadow-[var(--shadow-raised)]",
        className
      )}
      {...props}
    />
  )
);
Menubar.displayName = "Menubar";

const MenubarTrigger = React.forwardRef<
  HTMLButtonElement,
  MenuPrimitive.Trigger.Props
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors",
      "focus:bg-accent focus:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground",
      className
    )}
    {...props}
  />
));
MenubarTrigger.displayName = "MenubarTrigger";

const MenubarSubTrigger = React.forwardRef<
  HTMLElement,
  MenuPrimitive.SubmenuTrigger.Props & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenuPrimitive.SubmenuTrigger
    ref={ref}
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
  </MenuPrimitive.SubmenuTrigger>
));
MenubarSubTrigger.displayName = "MenubarSubTrigger";

const MenubarSubContent = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Popup.Props &
    Pick<
      MenuPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>(
  (
    {
      className,
      align = "start",
      alignOffset = 0,
      side = "right",
      sideOffset = 0,
      ...props
    },
    ref
  ) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={ref}
          className={cn(popSurface, popAnimation, className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
);
MenubarSubContent.displayName = "MenubarSubContent";

const MenubarContent = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Popup.Props &
    Pick<
      MenuPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>(
  (
    {
      className,
      align = "start",
      alignOffset = -4,
      side,
      sideOffset = 8,
      ...props
    },
    ref
  ) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={ref}
          className={cn(popSurface, popAnimation, className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
);
MenubarContent.displayName = "MenubarContent";

const MenubarItem = React.forwardRef<
  HTMLElement,
  MenuPrimitive.Item.Props & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
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
));
MenubarItem.displayName = "MenubarItem";

const MenubarCheckboxItem = React.forwardRef<
  HTMLElement,
  MenuPrimitive.CheckboxItem.Props
>(({ className, children, checked, ...props }, ref) => (
  <MenuPrimitive.CheckboxItem
    ref={ref}
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
      <MenuPrimitive.CheckboxItemIndicator>
        <Check className="h-4 w-4 text-primary" />
      </MenuPrimitive.CheckboxItemIndicator>
    </span>
    {children}
  </MenuPrimitive.CheckboxItem>
));
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

const MenubarRadioItem = React.forwardRef<
  HTMLElement,
  MenuPrimitive.RadioItem.Props
>(({ className, children, ...props }, ref) => (
  <MenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
      "focus:bg-accent focus:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenuPrimitive.RadioItemIndicator>
        <Circle className="h-2 w-2 fill-primary text-primary" />
      </MenuPrimitive.RadioItemIndicator>
    </span>
    {children}
  </MenuPrimitive.RadioItem>
));
MenubarRadioItem.displayName = "MenubarRadioItem";

const MenubarLabel = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.GroupLabel.Props & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenuPrimitive.GroupLabel
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
MenubarLabel.displayName = "MenubarLabel";

const MenubarSeparator = React.forwardRef<
  HTMLDivElement,
  MenuPrimitive.Separator.Props
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
MenubarSeparator.displayName = "MenubarSeparator";

const MenubarShortcut = ({
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
MenubarShortcut.displayName = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
