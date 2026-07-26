import type { Metadata } from "next";
import { ArchitectureLive } from "@/components/architecture-live";

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "Live architecture view — signed ingest, outbox, Kafka, rules, ledger.",
};

export default function ArchitecturePage() {
  return <ArchitectureLive />;
}
