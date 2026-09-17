import { ErrorIcon } from "@/components/icons/error";
import { WarningIcon } from "@/components/icons/warning";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  const Icon = tone === "error" ? ErrorIcon : WarningIcon;
  return (
    <Alert variant={tone === "error" ? "destructive" : "warning"}>
      <Icon className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{detail}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <a href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer">
              Recorded Arena demo
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
