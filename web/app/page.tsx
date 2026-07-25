import type { Metadata } from "next";
import { PulseTheater } from "@/components/pulse-theater";

export const metadata: Metadata = {
  title: "Pulse Arena",
};

export default function Home() {
  return <PulseTheater />;
}
