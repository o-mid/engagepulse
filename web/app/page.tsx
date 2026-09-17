import type { Metadata } from "next";
import { PulseTheater } from "@/components/pulse-theater";

export const metadata: Metadata = {
  title: "Arena",
  description: "Live dual-tenant demo: HMAC ingest, outbox, Kafka, credit-once.",
};

export default function Home() {
  return <PulseTheater />;
}
