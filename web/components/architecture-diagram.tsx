"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ARCH_BRANCH,
  ARCH_MAIN,
  ARCH_STAGES,
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

const MAIN_IDS = ARCH_MAIN.map((node) => node.id);
const PULSE = {
  type: "tween" as const,
  duration: 0.28,
  ease: [0.215, 0.61, 0.355, 1] as const,
};
const STILL = { duration: 0 } as const;

export function ArchitectureDiagram({
  selected,
  onSelect,
  hotIds,
  variant = "full",
  groupName = "event-path",
}: Props) {
  const reduce = useReducedMotion();
  const hot = new Set(hotIds);
  const compact = variant === "compact";
  const stepOf = new Map(MAIN_IDS.map((id, i) => [id, i + 1]));
  const cursor = MAIN_IDS.includes(selected)
    ? MAIN_IDS.indexOf(selected)
    : selected === "dlq"
      ? MAIN_IDS.indexOf("worker")
      : 0;
  const userSelect = usePathFlow(selected, onSelect, hot, reduce === true);

  return (
    <figure
      className="min-w-0"
      onPointerEnter={() => userSelect.pause()}
      onFocusCapture={() => userSelect.pause()}
    >
      <figcaption
        className={
          compact
            ? "sr-only"
            : "mb-3 min-w-0 text-pretty break-words text-sm text-muted-foreground"
        }
      >
        Sign, accept, apply. DLQ if the worker gives up.
      </figcaption>

      <div className="flex min-w-0 flex-col gap-5">
        {ARCH_STAGES.map((stage) => (
          <PathStage
            key={stage.id}
            label={stage.label}
            ids={stage.ids}
            selected={selected}
            hot={hot}
            compact={compact}
            groupName={groupName}
            stepOf={stepOf}
            cursor={cursor}
            reduce={reduce === true}
            onSelect={userSelect}
          />
        ))}
      </div>

      <div className="mt-5 w-56 max-w-full border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">Fails after retry ×3</p>
        <div className="mt-2 flex flex-col items-start gap-1">
          <Hop
            dir="down"
            lit={selected === "dlq" || hot.has("dlq")}
            flowing={selected === "dlq" && reduce !== true}
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
              reduce={reduce === true}
              onSelect={userSelect}
            />
          ))}
        </div>
      </div>
    </figure>
  );
}

function PathStage({
  label,
  ids,
  selected,
  hot,
  compact,
  groupName,
  stepOf,
  cursor,
  reduce,
  onSelect,
}: {
  label: string;
  ids: ArchNodeId[];
  selected: ArchNodeId;
  hot: Set<ArchNodeId>;
  compact: boolean;
  groupName: string;
  stepOf: Map<ArchNodeId, number>;
  cursor: number;
  reduce: boolean;
  onSelect: (id: ArchNodeId) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <ol className="grid list-none grid-cols-1 gap-1 p-0 lg:grid-cols-5 lg:items-center lg:gap-0">
        {ids.map((id, i) => {
          const node = nodeById(id);
          const next = ids[i + 1];
          const index = MAIN_IDS.indexOf(id);
          const passed = index >= 0 && index < cursor;
          const at = index === cursor;
          const edgeLit = passed || at || hopLit(id, next, selected, hot);
          return (
            <li
              key={id}
              className="flex min-w-0 flex-col lg:flex-row lg:items-center"
            >
              <PathNode
                node={node}
                step={stepOf.get(id) ?? null}
                selected={selected === id}
                hot={hot.has(id)}
                compact={compact}
                groupName={groupName}
                reduce={reduce}
                onSelect={onSelect}
              />
              {next ? (
                <>
                  <Hop
                    dir="down"
                    lit={edgeLit}
                    flowing={at && !reduce}
                    className="self-center lg:hidden"
                  />
                  <Hop
                    dir="right"
                    lit={edgeLit}
                    flowing={at && !reduce}
                    className="mx-1 hidden shrink-0 lg:flex"
                  />
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function usePathFlow(
  selected: ArchNodeId,
  onSelect: (id: ArchNodeId) => void,
  hot: Set<ArchNodeId>,
  reduce: boolean,
) {
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selected);
  const hotRef = useRef(hot);
  const pauseUntil = useRef(0);
  onSelectRef.current = onSelect;
  selectedRef.current = selected;
  hotRef.current = hot;

  const pause = useCallback(() => {
    pauseUntil.current = Date.now() + 8000;
  }, []);

  const choose = useCallback(
    (id: ArchNodeId) => {
      pause();
      onSelectRef.current(id);
    },
    [pause],
  );

  useEffect(() => {
    if (reduce) return;
    const hotMain = MAIN_IDS.filter((id) => hot.has(id));
    if (!hotMain.length || Date.now() < pauseUntil.current) return;
    const next = hotMain[hotMain.length - 1];
    if (next !== selectedRef.current) onSelectRef.current(next);
  }, [hot, reduce]);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      const live = MAIN_IDS.some((id) => hotRef.current.has(id));
      if (live) return;
      const here = MAIN_IDS.indexOf(selectedRef.current);
      const next = MAIN_IDS[here < 0 ? 0 : (here + 1) % MAIN_IDS.length];
      onSelectRef.current(next);
    }, 1100);
    return () => window.clearInterval(timer);
  }, [reduce]);

  return Object.assign(choose, { pause });
}

function hopLit(
  from: ArchNodeId,
  to: ArchNodeId | undefined,
  selected: ArchNodeId,
  hot: Set<ArchNodeId>,
): boolean {
  if (!to) return selected === from || hot.has(from);
  return selected === from || selected === to || (hot.has(from) && hot.has(to));
}

function Hop({
  dir,
  lit,
  flowing = false,
  className,
}: {
  dir: "right" | "down";
  lit: boolean;
  flowing?: boolean;
  className?: string;
}) {
  const Icon = dir === "right" ? ArrowRightIcon : ArrowDownIcon;
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden",
        dir === "down" ? "h-5 w-6" : "h-6 w-5",
        lit ? "text-primary" : "text-muted-foreground",
        className,
      )}
    >
      {flowing ? (
        <span
          className={dir === "right" ? "path-hop-flow-x" : "path-hop-flow-y"}
        />
      ) : null}
      <Icon className="relative size-4" />
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
  reduce,
  onSelect,
}: {
  node: ArchNode;
  step: number | null;
  selected: boolean;
  hot: boolean;
  compact: boolean;
  groupName: string;
  reduce: boolean;
  onSelect: (id: ArchNodeId) => void;
}) {
  const status = selected ? "selected" : hot ? "live" : "idle";
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
      )}
    >
      {selected ? (
        <motion.span
          layoutId={`${groupName}-pulse`}
          className="pointer-events-none absolute inset-0 rounded-md border-2 border-primary"
          transition={reduce ? STILL : PULSE}
        />
      ) : null}
      <input
        type="radio"
        name={groupName}
        value={node.id}
        checked={selected}
        onChange={() => onSelect(node.id)}
        className="sr-only"
      />
      <span className="relative flex min-w-0 items-baseline gap-2">
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
        <span className="min-w-0 truncate text-sm font-semibold leading-tight">
          {node.label}
        </span>
      </span>
      {compact ? null : (
        <span className="relative mt-0.5 text-xs text-muted-foreground">
          {node.plain}
        </span>
      )}
      <span className="sr-only"> {status}</span>
    </label>
  );
}
