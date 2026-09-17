"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContractRun } from "@/components/contract-run";
import {
  NOT_TOOLS,
  REPLAY_CONTRACT,
  SHADOW_BOARD,
  TOOLS,
} from "@/lib/ops-notes";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["replay", "tools", "shadow"] as const;
type ContractTab = (typeof TABS)[number];

function isTab(value: string | null): value is ContractTab {
  return TABS.includes(value as ContractTab);
}

export function OpsPanels() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = isTab(searchParams.get("tab")) ? searchParams.get("tab")! : "replay";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ContractRun />
    <Tabs
      value={tab}
      onValueChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next === "replay") params.delete("tab");
        else params.set("tab", String(next));
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      }}
    >
      <TabsList aria-label="Ledger clients">
        <TabsTrigger value="replay">Replay</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
        <TabsTrigger value="shadow">Shadow</TabsTrigger>
      </TabsList>

      <TabsContent value="replay">
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          <code className="font-mono">make replay</code> applies{" "}
          <code className="font-mono">testdata/replay/</code> through the worker
          and fails if player JSON drifts.
        </p>
        <div className="mt-3 min-w-0">
          <Table className="min-w-0">
            <TableCaption className="text-pretty">
              Expected replay player snapshots
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="hidden sm:table-cell">Tags</TableHead>
                <TableHead className="hidden sm:table-cell">Flag</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REPLAY_CONTRACT.map((row) => (
                <TableRow key={row.pack}>
                  <TableCell className="font-mono break-all">{row.pack}</TableCell>
                  <TableCell className="font-mono break-all">{row.playerId}</TableCell>
                  <TableCell>{row.vipTier}</TableCell>
                  <TableCell className="tabular-nums">{row.score}</TableCell>
                  <TableCell className="hidden font-mono break-all sm:table-cell">
                    {row.tags}
                  </TableCell>
                  <TableCell className="hidden font-mono sm:table-cell">
                    {row.flag}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="tools">
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          <code className="font-mono">POST /v1/tools/{"{name}"}</code> wraps
          partner ingest and reads. Auth is an API key. Unknown names return
          404.
        </p>
        <div className="mt-3">
          <Table>
            <TableCaption>Allowlisted HTTP tools</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Does</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TOOLS.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-mono">{row.name}</TableCell>
                  <TableCell className="font-mono">{row.auth}</TableCell>
                  <TableCell>{row.does}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Not tools</span>
          {NOT_TOOLS.map((name) => (
            <Badge key={name} variant="destructive-light">
              {name}
            </Badge>
          ))}
        </p>
      </TabsContent>

      <TabsContent value="shadow">
        <p className="mt-3 max-w-2xl text-pretty text-sm text-muted-foreground">
          Shadow scores packs in memory. It does not credit or set VIP. The LLM
          is not on the credit path.
        </p>
        <div className="mt-3">
          <Table>
            <TableCaption>Mock shadow scorer versus velocity rule</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Agree</TableHead>
                <TableHead className="hidden sm:table-cell">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SHADOW_BOARD.map((row) => (
                <TableRow key={row.pack}>
                  <TableCell className="font-mono">{row.pack}</TableCell>
                  <TableCell>{row.rule}</TableCell>
                  <TableCell>{row.model}</TableCell>
                  <TableCell>
                    {row.agree === "no" ? (
                      <Badge variant="warning-light">disagree</Badge>
                    ) : (
                      <Badge variant="success-light">agree</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-[14rem] text-pretty text-muted-foreground sm:table-cell">
                    {row.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}
