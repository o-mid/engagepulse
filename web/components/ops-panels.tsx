import {
  NOT_TOOLS,
  REPLAY_CONTRACT,
  SHADOW_BOARD,
  TOOLS,
} from "@/lib/ops-notes";

export function OpsPanels() {
  return (
    <section className="mt-8 space-y-6" aria-labelledby="ops-notes-heading">
      <div>
        <h2 id="ops-notes-heading" className="display text-xl">
          Ops notes
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--fog-dim)]">
          Read-only contract from the expansion. These tables do not call a
          model and do not write VIP or balance. Writeup:{" "}
          <a
            href="https://github.com/o-mid/engagepulse/blob/develop/docs/architecture.md"
            target="_blank"
            rel="noreferrer"
            className="focus-ring underline decoration-[color-mix(in_oklab,var(--gold)_40%,transparent)] underline-offset-4"
          >
            docs/architecture.md
          </a>
          .
        </p>
      </div>

      <div className="glass-panel rounded-sm p-4">
        <h3 className="display text-lg">Replay contract</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fog-dim)]">
          <code className="mono">make replay</code> applies{" "}
          <code className="mono">testdata/replay/</code> through the worker and
          fails if player JSON drifts. <code className="mono">make demo</code> is
          the guided tour. <code className="mono">make rulepatch</code> prints an
          advisory diff; it does not write{" "}
          <code className="mono">internal/rules</code>.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <caption className="sr-only">Expected replay player snapshots</caption>
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

      <div className="glass-panel rounded-sm p-4">
        <h3 className="display text-lg">Shadow vs velocity</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fog-dim)]">
          <code className="mono">make shadow</code> scores recorded packs against
          the velocity rule. The mock flags when pack bets are at least 5. It
          does not credit or set VIP. This table is that mock contract, not a
          live model call.
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
                    {row.agree === "no" ? "disagree" : "agree"}
                  </td>
                  <td className="py-2 text-[var(--fog-dim)]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel rounded-sm p-4">
        <h3 className="display text-lg">Allowlisted tools</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fog-dim)]">
          <code className="mono">POST /v1/tools/{"{name}"}</code> wraps partner
          ingest and reads. Auth is an API key. Unknown names return 404. There
          is no credit tool and no set-VIP tool.
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
    </section>
  );
}
