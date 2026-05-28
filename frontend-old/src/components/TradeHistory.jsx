import React from "react";
import { Zap, ExternalLink, TrendingUp, TrendingDown, Clock } from "lucide-react";

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export default function TradeHistory({ trades }) {
  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col h-full min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border flex-shrink-0">
        <h2 className="text-xs font-mono font-bold text-cyber-text uppercase tracking-widest flex items-center gap-2">
          <Zap size={13} className="text-cyber-primary" />
          Byreal Execution Logs
        </h2>
        <span className="text-[10px] text-cyber-muted font-mono">
          {trades.length} executions
        </span>
      </div>

      <div className="flex-1 overflow-x-auto">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="w-10 h-10 rounded-full border border-cyber-border flex items-center justify-center">
              <Zap size={18} className="text-cyber-muted/40" />
            </div>
            <p className="text-[11px] text-cyber-muted font-mono">No trades executed yet</p>
            <p className="text-[10px] text-cyber-muted/50 font-mono">Acts on signals with confidence ≥ 75%</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead>
              <tr className="border-b border-cyber-border text-cyber-muted text-[10px] uppercase tracking-wider">
                <th className="pb-2 font-semibold">Time</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Pair</th>
                <th className="pb-2 font-semibold">Size</th>
                <th className="pb-2 font-semibold">PnL / Out</th>
                <th className="pb-2 font-semibold text-right">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/30">
              {trades.map((trade) => {
                const res   = trade.result ?? {};
                const isBuy = trade.type === "BUY";
                const ok    = res.success;
                const pnlPositive = res.pnl && res.pnl.startsWith("+");

                return (
                  <tr key={trade.id} className="hover:bg-cyber-card/40 transition-colors duration-150">
                    {/* Time */}
                    <td className="py-2.5 text-cyber-muted">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-cyber-muted/50" />
                        {timeAgo(trade.timestamp)}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        {isBuy
                          ? <TrendingUp size={11} className="text-cyber-emerald" />
                          : <TrendingDown size={11} className="text-cyber-rose" />
                        }
                        <span className={`font-bold ${isBuy ? "text-cyber-emerald" : "text-cyber-rose"}`}>
                          {trade.type}
                        </span>
                      </div>
                    </td>

                    {/* Pair */}
                    <td className="py-2.5 text-cyber-text">
                      {trade.pair || (isBuy ? "USDC → SOL" : "SOL → USDC")}
                    </td>

                    {/* Size */}
                    <td className="py-2.5 text-cyber-text">
                      {trade.amount ? `$${trade.amount}` : "—"}
                    </td>

                    {/* PnL */}
                    <td className="py-2.5">
                      {ok ? (
                        res.pnl ? (
                          <span className={`font-bold ${pnlPositive ? "text-cyber-emerald" : "text-cyber-rose"}`}>
                            {res.pnl}
                          </span>
                        ) : res.outputAmount != null ? (
                          <span className="text-cyber-emerald">+{res.outputAmount} SOL</span>
                        ) : (
                          <span className="text-cyber-muted">—</span>
                        )
                      ) : (
                        <span className="text-cyber-rose font-bold">Failed</span>
                      )}
                    </td>

                    {/* Tx */}
                    <td className="py-2.5 text-right">
                      {ok ? (
                        res.isMock ? (
                          <span className="text-cyber-gold/80 text-[10px]" title={res.txHash}>
                            {res.txHash ? `${res.txHash.slice(0, 6)}…` : "MOCK"} [MOCK]
                          </span>
                        ) : res.txHash ? (
                          <a
                            href={`https://solscan.io/tx/${res.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-cyber-primary hover:text-cyber-primary/80 font-bold transition-colors"
                          >
                            {res.txHash.slice(0, 6)}…{res.txHash.slice(-4)}
                            <ExternalLink size={9} />
                          </a>
                        ) : (
                          <span className="text-cyber-muted">—</span>
                        )
                      ) : (
                        <span className="text-cyber-rose text-[10px] truncate max-w-[120px] block ml-auto" title={res.error}>
                          {res.error || "Error"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
