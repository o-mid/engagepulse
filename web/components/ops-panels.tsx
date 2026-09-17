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

export function OpsPanels() {
  return (
    <Tabs defaultValue="replay">
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
        <div className="mt-3">
          <Table>
            <TableCaption>Expected replay player snapshots</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REPLAY_CONTRACT.map((row) => (
                <TableRow key={row.pack}>
                  <TableCell className="font-mono">{row.pack}</TableCell>
                  <TableCell className="font-mono">{row.playerId}</TableCell>
                  <TableCell>{row.vipTier}</TableCell>
                  <TableCell className="tabular-nums">{row.score}</TableCell>
                  <TableCell className="font-mono">{row.tags}</TableCell>
                  <TableCell className="font-mono">{row.flag}</TableCell>
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
        <p className="mt-3 text-sm text-muted-foreground">
          Not tools:{" "}
          {NOT_TOOLS.map((name) => (
            <Badge key={name} variant="destructive-light" className="ml-1">
              {name}
            </Badge>
          ))}
        </p>
      </TabsContent>

      <TabsContent value="shadow">
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          <code className="font-mono">make shadow</code> scores recorded packs
          against the velocity rule. The mock does not credit or set VIP. This
          table is that mock contract, not a live model call.
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
                <TableHead>Note</TableHead>
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
                  <TableCell className="text-muted-foreground">{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
