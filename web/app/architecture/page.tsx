import type { Metadata } from "next";
import { ArchitectureLive } from "@/components/architecture-live";

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "Event path diagram: HMAC sign in the BFF, verify in Go, outbox, Kafka, worker tx, ledger.",
};

export default function ArchitecturePage() {
  return <ArchitectureLive />;
}
