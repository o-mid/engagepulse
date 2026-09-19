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

  return (
    <figure className="min-w-0">
      <figcaption
        className={
          compact
            ? "sr-only"
            : "mb-3 min-w-0 text-pretty break-words text-sm text-muted-foreground"
        }
      >
        Happy path left to right, then worker. DLQ is the fail branch after
        retry ×3.
      </figcaption>

      <div className="flex min-w-0 flex-col gap-1 lg:gap-2">
        <PathRow
          ids={ARCH_ROW_1}
          selected={selected}
          hot={hot}
          compact={compact}
          groupName={groupName}
          stepOf={stepOf}
          onSelect={onSelect}
        />
        <div className="flex justify-center lg:grid lg:grid-cols-5">
          <p className="col-start-5 hidden items-center justify-center gap-1 text-xs text-muted-foreground lg:flex">
            <ArrowDownIcon
              className={cn(
                "size-4",
                hopLit("kafka", "worker", selected, hot)
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              aria-hidden
            />
            then worker
          </p>
          <Hop
            dir="down"
            lit={hopLit("kafka", "worker", selected, hot)}
            className="lg:hidden"
          />
        </div>
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

      <div className="mt-4 max-w-sm border-t border-border pt-3 lg:w-1/5 lg:max-w-none">
        <p className="text-xs text-muted-foreground">
          Fail from worker after retry ×3
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Hop
            dir="down"
            lit={hopLit("worker", "dlq", selected, hot)}
            className="shrink-0"
          />
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
    <ol className="grid list-none grid-cols-1 gap-1 p-0 lg:grid-cols-5 lg:items-center lg:gap-x-3 lg:gap-y-0">
      {ids.map((id, i) => {
        const node = nodeById(id);
        const next = ids[i + 1];
        return (
          <li key={id} className="relative flex min-w-0 flex-col gap-1">
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
              <>
                <Hop
                  dir="down"
                  lit={hopLit(id, next, selected, hot)}
                  className="lg:hidden"
                />
                <Hop
                  dir="right"
                  lit={hopLit(id, next, selected, hot)}
                  className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 lg:flex"
                />
              </>
            ) : null}
          </li>
        );
      })}
    </ol>
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
            className="shrink-0 normal-case tracking-normal"
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
          <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--gauge-ok)]">
            hot
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 text-xs text-muted-foreground">{node.plain}</span>
      <span className="sr-only"> {status}</span>
    </label>
  );
}
