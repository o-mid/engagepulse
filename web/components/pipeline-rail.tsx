"use client";

import { TaskSteps } from "@/components/ui/ix-task-steps";
import type { DemoBeat } from "@/lib/demo-script";

const RUN_STEPS = [
  { id: "hmac", label: "HMAC sign", meta: "BFF" },
  { id: "outbox", label: "Outbox, then 202", meta: "accept" },
  { id: "worker", label: "Kafka, then worker tx", meta: "mark+state+credit" },
  { id: "acme", label: "GET Acme player", meta: "VIP" },
  { id: "nova", label: "GET Nova player", meta: "velocity" },
] as const;

function stepIndex(beat: DemoBeat) {
  if (beat === "idle") return -1;
  if (beat === "payoff") return RUN_STEPS.length;
  if (beat === "error") return 0;
  const map: Record<string, number> = {
    sign: 0,
    ingest: 1,
    stream: 2,
    acme: 3,
    nova: 4,
  };
  return map[beat] ?? 0;
}

type Props = {
  beat: DemoBeat;
  caption: string;
};

export function PipelineRail({ beat, caption }: Props) {
  const current = stepIndex(beat);
  const failed = beat === "error";
  if (current < 0 && !failed) return null;

  return (
    <div>
      <TaskSteps
        steps={[...RUN_STEPS]}
        current={Math.max(0, current)}
        failed={failed}
        label="This run"
      />
      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
