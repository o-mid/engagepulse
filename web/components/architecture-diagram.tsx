"use client";

import {
  ARCH_BRANCH,
  ARCH_MAIN,
  ARCH_ROW_1,
  ARCH_ROW_2,
  nodeById,
  type ArchNode,
  type ArchNodeId,
} from "@/lib/architecture";
import { ArrowDownIcon, ArrowRightIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  selected: ArchNodeId;
  onSelect: (id: ArchNodeId) => void;
  hotIds: ArchNodeId[];
  variant?: "full" | "compact";
  groupName?: string;
};

const PATH_GRID =
  "lg:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)_1.5rem_minmax(0,1fr)_1.5rem_minmax(0,1fr)_1.5rem_minmax(0,1fr)]";

export function ArchitectureDiagram({
  selected,
  onSelect,
  hotIds,
  variant = "full",
  groupName = "event-path",
}: Props) {
  const hot = new Set(hotIds);
  const compact = variant === "compact";
  const stepOf = new Map(ARCH_MAIN.map((node, i) => [node.id, i + 1]));
  const wrapLit = hopLit("kafka", "worker", selected, hot);

  return (
    <figure className="min-w-0">
      <figcaption
        className={
          compact
            ? "sr-only"
            : "mb-3 min-w-0 text-pretty break-words text-sm text-muted-foreground"
        }
      >
        Happy path 1 to 9. DLQ only after retry ×3.
      </figcaption>

      <div className="flex min-w-0 flex-col">
        <PathRow
          ids={ARCH_ROW_1}
          selected={selected}
          hot={hot}
          compact={compact}
          groupName={groupName}
          stepOf={stepOf}
          onSelect={onSelect}
        />
        <Hop
          dir="down"
          lit={wrapLit}
          className="self-center lg:hidden"
        />
        <WrapRail lit={wrapLit} />
        <p className="sr-only">Then the worker.</p>
        <PathRow
          ids={ARCH_ROW_2}
          selected={selected}
          hot={hot}
          compact={compact}
          groupName={groupName}
          stepOf={stepOf}
          onSelect={onSelect}
        />
      </div>

      <div
        className={cn(
          "mt-2 grid grid-cols-1 lg:mt-3 lg:gap-0",
          PATH_GRID,
        )}
      >
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">After retry ×3</p>
          <div className="mt-1 flex flex-col items-center gap-1">
            <Hop dir="down" lit={hopLit("worker", "dlq", selected, hot)} />
            {ARCH_BRANCH.map((node) => (
              <PathNode
                key={node.id}
                node={node}
                step={null}
                selected={selected === node.id}
                hot={hot.has(node.id)}
                compact={compact}
                groupName={groupName}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

function PathRow({
  ids,
  selected,
  hot,
  compact,
  groupName,
  stepOf,
  onSelect,
}: {
  ids: ArchNodeId[];
  selected: ArchNodeId;
  hot: Set<ArchNodeId>;
  compact: boolean;
  groupName: string;
  stepOf: Map<ArchNodeId, number>;
  onSelect: (id: ArchNodeId) => void;
}) {
  return (
    <ol
      className={cn(
        "grid list-none grid-cols-1 gap-1 p-0 lg:items-center lg:gap-0",
        PATH_GRID,
      )}
    >
      {ids.map((id, i) => {
        const node = nodeById(id);
        const next = ids[i + 1];
        return (
          <li key={id} className="contents">
            <div className="min-w-0">
              <PathNode
                node={node}
                step={stepOf.get(id) ?? null}
                selected={selected === id}
                hot={hot.has(id)}
                compact={compact}
                groupName={groupName}
                onSelect={onSelect}
              />
              {next ? (
                <Hop
                  dir="down"
                  lit={hopLit(id, next, selected, hot)}
                  className="lg:hidden"
                />
              ) : null}
            </div>
            {next ? (
              <div
                aria-hidden
                className="hidden items-center justify-center lg:flex"
              >
                <Hop dir="right" lit={hopLit(id, next, selected, hot)} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function WrapRail({ lit }: { lit: boolean }) {
  const stroke = lit ? "bg-primary" : "bg-muted-foreground";
  const icon = lit ? "text-primary" : "text-muted-foreground";
  return (
    <div
      aria-hidden
      className={cn("relative hidden h-14 lg:grid", PATH_GRID)}
    >
      <div className="relative">
        <span className={cn("absolute left-1/2 right-0 top-1/2 h-0.5", stroke)} />
        <span
          className={cn(
            "absolute bottom-1 left-1/2 top-1/2 w-0.5 -translate-x-px",
            stroke,
          )}
        />
        <ArrowDownIcon
          className={cn(
            "absolute bottom-0 left-1/2 size-4 -translate-x-1/2",
            icon,
          )}
        />
      </div>
      <div className="relative col-span-7">
        <span className={cn("absolute inset-x-0 top-1/2 h-0.5", stroke)} />
      </div>
      <div className="relative">
        <span
          className={cn(
            "absolute left-1/2 top-1 h-1/2 w-0.5 -translate-x-px",
            stroke,
          )}
        />
        <span
          className={cn("absolute left-0 right-1/2 top-1/2 h-0.5", stroke)}
        />
        <ArrowDownIcon
          className={cn(
            "absolute left-1/2 top-0 size-4 -translate-x-1/2",
            icon,
          )}
        />
      </div>
    </div>
  );
}

function hopLit(
  from: ArchNodeId,
  to: ArchNodeId,
  selected: ArchNodeId,
  hot: Set<ArchNodeId>,
): boolean {
  return selected === from || selected === to || (hot.has(from) && hot.has(to));
}

function Hop({
  dir,
  lit,
  className,
}: {
  dir: "right" | "down";
  lit: boolean;
  className?: string;
}) {
  const Icon = dir === "right" ? ArrowRightIcon : ArrowDownIcon;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        dir === "down" && "py-0.5",
        lit ? "text-primary" : "text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

function PathNode({
  node,
  step,
  selected,
  hot,
  compact,
  groupName,
  onSelect,
}: {
  node: ArchNode;
  step: number | null;
  selected: boolean;
  hot: boolean;
  compact: boolean;
  groupName: string;
  onSelect: (id: ArchNodeId) => void;
}) {
  const status = hot ? "hot" : selected ? "selected" : "idle";
  return (
    <label
      data-hot={hot ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      className={cn(
        "arch-node relative flex w-full min-w-0 cursor-pointer flex-col justify-center rounded-md border px-2.5 py-2",
        compact ? "min-h-10" : "min-h-11",
        selected
          ? "border-primary bg-primary/10 text-foreground shadow-[var(--shadow-focus)]"
          : "border-border bg-card text-foreground shadow-[var(--shadow-nested)]",
        hot && !selected && "border-[var(--gauge-ok)]",
      )}
    >
      <input
        type="radio"
        name={groupName}
        value={node.id}
        checked={selected}
        onChange={() => onSelect(node.id)}
        className="sr-only"
      />
      <span className="flex min-w-0 items-baseline gap-2">
        {step != null ? (
          <Badge
            variant="outline"
            size="sm"
            className="shrink-0 normal-case tracking-normal text-muted-foreground"
          >
            {step}
          </Badge>
        ) : (
          <Badge variant="warning-light" size="sm" className="shrink-0">
            fail
          </Badge>
        )}
        <span className="min-w-0 text-sm font-semibold leading-tight">
          {node.label}
        </span>
        {hot ? (
          <span className="ml-auto shrink-0 text-[10px] font-medium text-[var(--gauge-ok)]">
            live
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 text-xs text-muted-foreground">{node.plain}</span>
      <span className="sr-only"> {status}</span>
    </label>
  );
}
