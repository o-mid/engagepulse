"use client";

import { ARCH_BRANCH, ARCH_MAIN, type ArchNode, type ArchNodeId } from "@/lib/architecture";
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

  return (
    <figure className="min-w-0">
      <figcaption className={compact ? "sr-only" : "mb-3 text-sm text-muted-foreground"}>
        Partner to GET player. HMAC is signed in the BFF and verified in Go.
        Worker retries three times, then DLQ.
      </figcaption>
      <ol className="flex list-none flex-wrap items-stretch gap-x-1 gap-y-3 p-0">
        {ARCH_MAIN.map((node, i) => (
          <li key={node.id} className="flex min-w-0 items-stretch gap-1">
            <PathNode
              node={node}
              selected={selected === node.id}
              hot={hot.has(node.id)}
              compact={compact}
              groupName={groupName}
              onSelect={onSelect}
            />
            {i < ARCH_MAIN.length - 1 ? (
              <Arrow kind="right" />
            ) : null}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground" aria-hidden>
          ↳
        </span>
        <p className="text-xs text-muted-foreground">After 3 worker retries</p>
        {ARCH_BRANCH.map((node) => (
          <PathNode
            key={node.id}
            node={node}
            selected={selected === node.id}
            hot={hot.has(node.id)}
            compact={compact}
            groupName={groupName}
            onSelect={onSelect}
          />
        ))}
      </div>
    </figure>
  );
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
        "arch-node relative flex min-h-11 min-w-[7.5rem] cursor-pointer flex-col justify-center rounded-md border px-2.5 py-2",
        compact ? "max-w-[9.5rem]" : "max-w-[11rem]",
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
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold leading-tight">{node.label}</span>
        {hot ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--gauge-ok)]">
            hot
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 text-xs text-muted-foreground">{node.plain}</span>
      <span className="sr-only"> {status}</span>
    </label>
  );
}

function Arrow({ kind }: { kind: "right" | "down" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-mono text-muted-foreground",
        kind === "right" ? "w-4 text-sm" : "h-4 text-sm",
      )}
    >
      {kind === "right" ? "→" : "↓"}
    </span>
  );
}
