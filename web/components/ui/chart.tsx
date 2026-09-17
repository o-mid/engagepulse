"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

// Gauge Dark Chart kit (recharts).
// Tooltips float above the plot, so they take the deepest shadow in the
// nested hierarchy (--shadow-pop) on the popover surface, with mono tabular
// readings, like the readout chip hovering over a metrics graph.
// NOTE: the [stroke='#ccc'] / [stroke='#fff'] attribute selectors below match
// recharts' own hardcoded SVG attributes; they are selectors, not colors.

/** Narrows a chart datum to a number, so the value renders as one. */
function isChartNumber<TValue>(value: TValue | number): value is number {
  return typeof value === "number"
}

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/40",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-sector]:outline-none",
          "[&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: Object.entries(config)
              .map(([k, v]) => {
                // SAFETY: this branch runs only for a config entry that carried a `theme`
                // map, which the ChartConfig type declares as colour-per-theme.
                const c = v as { color?: string; theme?: Record<string, string> };
                const col = c.color ?? c.theme?.light;
                return col ? `[data-chart="${chartId}"]{--color-${k}:${col};}` : "";
              })
              .join(""),
          }}
        />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      label,
      className,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart();
    // SAFETY: `config` is the ChartConfig this provider was given, whose values
    // declare an optional label.
    const cfg = config as Record<string, { label?: React.ReactNode }> | undefined;
    if (!active || !payload?.length) return null;

    const tooltipLabel = labelKey ? cfg?.[labelKey]?.label ?? label : label;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-pop)]",
          className
        )}
      >
        {!hideLabel && tooltipLabel !== undefined && tooltipLabel !== "" && (
          <div className="mb-1 font-medium text-foreground">{String(tooltipLabel)}</div>
        )}
        <div className="grid gap-1">
          {payload.map((item, i) => {
            // SAFETY: recharts types its tooltip payload as unknown, but every entry
            // this chart renders came from the `data` array the caller passed in.
            type ChartTooltipDatum = { fill?: string } & Record<
              string,
              string | number | null | undefined
            >
            // SAFETY: recharts types its tooltip payload as unknown, but every
            // entry this chart renders came from the caller's data array.
            const itemPayload = item.payload as ChartTooltipDatum | undefined;
            const key = nameKey
              ? String(itemPayload?.[nameKey] ?? item.name ?? i)
              : String(item.name ?? item.dataKey ?? i);
            const itemColor =
              // SAFETY: recharts writes `fill` onto the payload it hands back for the
              // series it drew, so it is present whenever a colour was resolved.
              item.color ?? itemPayload?.fill;
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {!hideIndicator && (
                    <span
                      className={cn(
                        "shrink-0",
                        indicator === "line"
                          ? "h-2.5 w-0.5 rounded-full"
                          : indicator === "dashed"
                            ? "h-2.5 w-0 border-l-[1.5px] border-dashed"
                            : "size-2 rounded-xs"
                      )}
                      style={
                        indicator === "dashed"
                          ? { borderColor: itemColor }
                          : { background: itemColor }
                      }
                    />
                  )}
                  {cfg?.[key]?.label ?? item.name}
                </span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {isChartNumber(item.value)
                    ? item.value.toLocaleString()
                    : item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    hideIcon?: boolean;
    nameKey?: string;
  }
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-4 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
