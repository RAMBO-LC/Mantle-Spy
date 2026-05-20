import React from "react";

export default function TradeHistory({ trades }) {
  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString();
  };

  return (
    <div className="glass-panel rounded-lg p-5 flex flex-col h-full min-h-[300px]">
      <div className="flex items-center justify-between mb-4 border-b border-cyber-border pb-3">
        <h2 className="text-base font-semibold tracking-wider text-cyber-primary flex items-center gap-2">
          <span>⚡</span> BYREAL SOLANA EXECUTION LOGS
        </h2>
        <span className="text-xs text-cyber-muted font-mono">{trades.length} Executions</span>
      </div>

      <div className="flex-1 overflow-x-auto">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-cyber-muted text-xs font-mono border border-dashed border-cyber-border rounded">
            <span>NO TRADES EXECUTED YET</span>
            <span className="text-[10px] mt-1 text-cyber-muted/50">Acts on signals with confidence &gt;= 75%</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-cyber-border text-cyber-muted text-[10px] uppercase">
                <th className="pb-2 font-semibold">Time</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Asset Pair</th>
                <th className="pb-2 font-semibold">Size</th>
                <th className="pb-2 font-semibold">PnL / Output</th>
                <th className="pb-2 font-semibold text-right">Solana Tx Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {trades.map((trade) => {
                const isBuy = trade.type === "BUY";
                const res = trade.result;
                const isSuccess = res && res.success;

                return (
                  <tr key={trade.id} className="hover:bg-cyber-card/30 transition-colors duration-150">
                    <td className="py-2.5 text-cyber-muted">{formatTime(trade.timestamp)}</td>
                    <td className="py-2.5">
                      <span
                        className={`font-bold ${
                          isBuy ? "text-cyber-emerald" : "text-cyber-rose"
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-cyber-text">
                      {isBuy ? "USDC → SOL" : "SOL-PERP CLOSE"}
                    </td>
                    <td className="py-2.5 text-cyber-text">
                      {isBuy ? `${trade.amount} USDC` : "Position"}
                    </td>
                    <td className="py-2.5">
                      {isSuccess ? (
                        isBuy ? (
                          <span className="text-cyber-emerald">+{res.outputAmount} SOL</span>
                        ) : (
                          <span className="text-cyber-emerald font-bold">{res.pnl}</span>
                        )
                      ) : (
                        <span className="text-cyber-rose font-bold">Failed</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      {isSuccess ? (
                        res.isMock ? (
                          <span className="text-cyber-gold/80" title={res.details}>
                            {res.txHash} [MOCK]
                          </span>
                        ) : (
                          <a
                            href={`https://solscan.io/tx/${res.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyber-primary hover:underline font-bold"
                          >
                            {res.txHash.slice(0, 8)}...{res.txHash.slice(-6)} ↗
                          </a>
                        )
                      ) : (
                        <span className="text-cyber-rose text-[10px] max-w-[150px] truncate block ml-auto" title={res.error}>
                          {res.error}
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
