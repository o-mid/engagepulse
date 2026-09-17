import type { Metadata } from "next";
import { PulseTheater } from "@/components/pulse-theater";

export const metadata: Metadata = {
  title: "Arena",
  description: "Dual-tenant demo and event path. HMAC ingest, outbox, Kafka, credit-once.",
};

export default function Home() {
  return <PulseTheater />;
}
