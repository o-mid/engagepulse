"use client";

import {
  ARCH_EDGES,
  ARCH_NODES,
  type ArchNode,
  type ArchNodeId,
} from "@/lib/architecture";
import { cn } from "@/lib/utils";

type Props = {
  selected: ArchNodeId;
  onSelect: (id: ArchNodeId) => void;
  hotIds: ArchNodeId[];
  variant?: "full" | "compact";
  groupName?: string;
};

const SLOT: Record<ArchNodeId, string> = {
  partner: "lg:col-start-1 lg:row-start-1",
  hmac: "lg:col-start-2 lg:row-start-1",
  ingest: "lg:col-start-3 lg:row-start-1",
  outbox: "lg:col-start-4 lg:row-start-1",
  kafka: "lg:col-start-5 lg:row-start-1",
  worker: "lg:col-start-1 lg:row-start-2",
  rules: "lg:col-start-2 lg:row-start-2",
  ledger: "lg:col-start-3 lg:row-start-2",
  read: "lg:col-start-4 lg:row-start-2",
  dlq: "lg:col-start-1 lg:row-start-3",
};

const COLS = 5;
const ROWS = 3;
const SLOT_XY: Record<ArchNodeId, { col: number; row: number }> = {
  partner: { col: 1, row: 1 },
  hmac: { col: 2, row: 1 },
  ingest: { col: 3, row: 1 },
  outbox: { col: 4, row: 1 },
  kafka: { col: 5, row: 1 },
  worker: { col: 1, row: 2 },
  rules: { col: 2, row: 2 },
  ledger: { col: 3, row: 2 },
  read: { col: 4, row: 2 },
  dlq: { col: 1, row: 3 },
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

  return (
    <figure className="min-w-0">
      <figcaption className={compact ? "sr-only" : "mb-3 text-pretty text-sm text-muted-foreground"}>
        Partner to GET player. HMAC is signed in the BFF and verified in Go.
        Worker retries three times, then DLQ.
      </figcaption>
      <div className={cn("relative min-w-0", compact ? "lg:min-h-[16rem]" : "lg:min-h-[20rem]")}>
        <svg
          aria-hidden
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block"
        >
          {ARCH_EDGES.map(([from, to]) => (
            <polyline
              key={`${from}-${to}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.55"
              className="text-muted-foreground"
              points={edgePoints(from, to)}
            />
          ))}
        </svg>
        <ol className="relative grid list-none grid-cols-1 gap-2 p-0 lg:grid-cols-5 lg:grid-rows-3 lg:gap-x-4 lg:gap-y-10">
          {ARCH_NODES.map((node) => (
            <li key={node.id} className={cn("min-w-0", SLOT[node.id])}>
              <PathNode
                node={node}
                selected={selected === node.id}
                hot={hot.has(node.id)}
                compact={compact}
                groupName={groupName}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}

function edgePoints(from: ArchNodeId, to: ArchNodeId): string {
  const a = SLOT_XY[from];
  const b = SLOT_XY[to];
  const x1 = ((a.col - 0.5) / COLS) * 100;
  const y1 = ((a.row - 0.5) / ROWS) * 60;
  const x2 = ((b.col - 0.5) / COLS) * 100;
  const y2 = ((b.row - 0.5) / ROWS) * 60;
  if (from === "kafka" && to === "worker") {
    const midY = (1.5 / ROWS) * 60;
    return `${x1},${y1} ${x1},${midY} ${x2},${midY} ${x2},${y2}`;
  }
  return `${x1},${y1} ${x2},${y2}`;
}

function PathNode({
  node,
  selected,
  hot,
  compact,
  groupName,
  onSelect,
}: {
  node: ArchNode;
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
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="min-w-0 text-sm font-semibold leading-tight">
          {node.label}
        </span>
        {hot ? (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--gauge-ok)]">
            hot
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 text-xs text-muted-foreground">{node.plain}</span>
      <span className="sr-only"> {status}</span>
    </label>
  );
}
