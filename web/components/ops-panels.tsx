import {
  NOT_TOOLS,
  REPLAY_CONTRACT,
  SHADOW_BOARD,
  TOOLS,
} from "@/lib/ops-notes";

export function OpsPanels() {
  return (
    <section className="mt-8 space-y-3" aria-labelledby="ops-notes-heading">
      <h2 id="ops-notes-heading" className="display text-xl">
        Ops notes
      </h2>
      <p className="max-w-2xl text-sm text-[var(--fog-dim)]">
        Read-only contract from the expansion on develop. These panels do not
        call a model and do not write VIP or balance.
      </p>

      <details className="ops-details glass-panel rounded-sm">
        <summary className="focus-ring display cursor-pointer px-4 py-3 text-lg">
          Replay contract
        </summary>
        <div className="border-t border-[var(--line)] px-4 py-3">
          <p className="text-sm leading-relaxed text-[var(--fog-dim)]">
            <code className="mono">make replay</code> applies{" "}
            <code className="mono">testdata/replay/</code> through the worker and
            fails if player JSON drifts. <code className="mono">make demo</code>{" "}
            is the guided tour of the same outcomes.{" "}
            <code className="mono">make rulepatch</code> prints an advisory
            diff and re-runs replay; it does not write{" "}
            <code className="mono">internal/rules</code>.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Expected replay player snapshots
              </caption>
              <thead>
                <tr className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--fog-mute)]">
                  <th className="py-2 pr-3 font-medium">pack</th>
                  <th className="py-2 pr-3 font-medium">player</th>
                  <th className="py-2 pr-3 font-medium">vip</th>
                  <th className="py-2 pr-3 font-medium">score</th>
                  <th className="py-2 pr-3 font-medium">tags</th>
                  <th className="py-2 pr-3 font-medium">flag</th>
                  <th className="py-2 font-medium">balance</th>
                </tr>
              </thead>
              <tbody>
                {REPLAY_CONTRACT.map((row) => (
                  <tr key={row.pack} className="border-t border-[var(--line)]">
                    <td className="py-2 pr-3 mono">{row.pack}</td>
                    <td className="py-2 pr-3 mono">{row.playerId}</td>
                    <td className="py-2 pr-3">{row.vipTier}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.score}</td>
                    <td className="py-2 pr-3 mono">{row.tags}</td>
                    <td className="py-2 pr-3 mono">{row.flag}</td>
                    <td className="py-2 tabular-nums">{row.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="ops-details glass-panel rounded-sm">
        <summary className="focus-ring display cursor-pointer px-4 py-3 text-lg">
          Shadow vs velocity
        </summary>
        <div className="border-t border-[var(--line)] px-4 py-3">
          <p className="text-sm leading-relaxed text-[var(--fog-dim)]">
            <code className="mono">make shadow</code> scores recorded packs
            against the velocity rule and prints this board. The mock scorer
            flags when pack bets are at least{" "}
            <code className="mono">VelocityBetLimit</code> (5). It does not
            credit or set VIP. CI uses the mock; this table is that mock
            contract, not a live model call.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Mock shadow scorer versus velocity rule
              </caption>
              <thead>
                <tr className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--fog-mute)]">
                  <th className="py-2 pr-3 font-medium">pack</th>
                  <th className="py-2 pr-3 font-medium">rule</th>
                  <th className="py-2 pr-3 font-medium">model</th>
                  <th className="py-2 pr-3 font-medium">agree</th>
                  <th className="py-2 font-medium">note</th>
                </tr>
              </thead>
              <tbody>
                {SHADOW_BOARD.map((row) => (
                  <tr key={row.pack} className="border-t border-[var(--line)]">
                    <td className="py-2 pr-3 mono">{row.pack}</td>
                    <td className="py-2 pr-3">{row.rule}</td>
                    <td className="py-2 pr-3">{row.model}</td>
                    <td className="py-2 pr-3">
                      {row.agree}
                      {row.agree === "no" ? " · disagree" : ""}
                    </td>
                    <td className="py-2 text-[var(--fog-dim)]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="ops-details glass-panel rounded-sm">
        <summary className="focus-ring display cursor-pointer px-4 py-3 text-lg">
          Allowlisted tools
        </summary>
        <div className="border-t border-[var(--line)] px-4 py-3">
          <p className="text-sm leading-relaxed text-[var(--fog-dim)]">
            <code className="mono">POST /v1/tools/{"{name}"}</code> wraps partner
            ingest and reads. Auth is <code className="mono">X-API-Key</code>.
            Unknown names return 404. There is no credit tool and no set-VIP
            tool. Send a signed event; rules and the ledger decide.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <caption className="sr-only">Allowlisted HTTP tools</caption>
              <thead>
                <tr className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--fog-mute)]">
                  <th className="py-2 pr-3 font-medium">name</th>
                  <th className="py-2 pr-3 font-medium">auth</th>
                  <th className="py-2 font-medium">does</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((row) => (
                  <tr key={row.name} className="border-t border-[var(--line)]">
                    <td className="py-2 pr-3 mono">{row.name}</td>
                    <td className="py-2 pr-3 mono">{row.auth}</td>
                    <td className="py-2 text-[var(--fog-dim)]">{row.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-[var(--fog-mute)]">
            Not tools: {NOT_TOOLS.join(", ")}.
          </p>
        </div>
      </details>
    </section>
  );
}
