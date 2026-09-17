import { DEMO_VIDEO_URL } from "@/lib/demo-script";

type Props = {
  title: string;
  detail: string;
  onRetry?: () => void;
  retryLabel?: string;
  tone?: "offline" | "error";
};

export function StatusBanner({
  title,
  detail,
  onRetry,
  retryLabel = "Retry",
  tone = "offline",
}: Props) {
  return (
    <aside
      role={tone === "error" ? "alert" : "status"}
      className="mt-4 rounded-sm border border-[color-mix(in_oklab,var(--ember)_45%,transparent)] bg-[rgba(255,107,74,0.1)] px-4 py-3"
    >
      <p className="display text-base text-[var(--ember)]">{title}</p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--fog-dim)]">
        {detail}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring mono min-h-11 rounded-sm border border-[color-mix(in_oklab,var(--ember)_40%,transparent)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--fog)]"
          >
            {retryLabel}
          </button>
        ) : null}
        <a
          href={DEMO_VIDEO_URL}
          target="_blank"
          rel="noreferrer"
          className="focus-ring mono inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_40%,transparent)] underline-offset-4"
        >
          Open Arena demo (mp4)
        </a>
      </div>
    </aside>
  );
}
