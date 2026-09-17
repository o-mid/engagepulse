"use client";

import type { StoryEvent } from "@/lib/demo-script";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  stories: StoryEvent[];
  totalAccepted: number;
  showAll: boolean;
  onToggle: () => void;
  allLabels: string[];
};

export function EventTicker({
  stories,
  totalAccepted,
  showAll,
  onToggle,
  allLabels,
}: Props) {
  if (totalAccepted === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Key moments appear after Ignite.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground">Key moments</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {stories.map((s) => (
          <li
            key={s.id}
            className="flex items-baseline justify-between gap-2 text-sm"
          >
            <span>
              <Badge
                variant={s.tenant === "acme" ? "secondary" : "success-light"}
                className="mr-2"
              >
                {s.tenant === "acme" ? "Acme" : "Nova"}
              </Badge>
              {s.label}
            </span>
            <span className="text-xs text-muted-foreground">{s.detail}</span>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="mt-2 h-auto px-0"
        onClick={onToggle}
      >
        {showAll ? "Hide packets" : `Show all ${totalAccepted} packets`}
      </Button>
      {showAll ? (
        <ul className="mt-2 max-h-28 overflow-auto font-mono text-xs text-muted-foreground">
          {allLabels.map((label, i) => (
            <li key={`${label}-${i}`}>{label}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
