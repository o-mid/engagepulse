import type { Metadata } from "next";
import { Suspense } from "react";
import { OpsPanels } from "@/components/ops-panels";

export const metadata: Metadata = {
  title: "Contract",
  description:
    "Replay contract, allowlisted tools, and the shadow vs velocity board.",
};

export default function ContractPage() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-6 px-4 py-5 md:px-6"
    >
      <header className="min-w-0">
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Replay and tools
        </h1>
        <p className="mt-2 max-w-xl text-pretty break-words text-base text-muted-foreground">
          Read-only clients of the ledger. They do not credit. The LLM is not on
          the credit path.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading contract tables.</p>
        }
      >
        <OpsPanels />
      </Suspense>
    </main>
  );
}
