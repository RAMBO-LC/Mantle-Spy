import React, { useState } from "react";

export default function SignalFeed({ signals }) {
  const [expandedId, setExpandedId] = useState(null);

  const getSignalStyles = (type) => {
    switch (type) {
      case "BUY":
        return {
          bg: "bg-cyber-emerald/10 border-cyber-emerald/40",
          text: "text-cyber-emerald",
          badge: "bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/50",
          glow: "text-glow-emerald"
        };
      case "SELL":
        return {
          bg: "bg-cyber-rose/10 border-cyber-rose/40",
          text: "text-cyber-rose",
          badge: "bg-cyber-rose/20 text-cyber-rose border-cyber-rose/50",
          glow: "text-glow-rose"
        };
      case "WATCH":
        return {
          bg: "bg-cyber-gold/10 border-cyber-gold/40",
          text: "text-cyber-gold",
          badge: "bg-cyber-gold/20 text-cyber-gold border-cyber-gold/50",
          glow: "text-glow-gold"
        };
      default:
        return {
          bg: "bg-cyber-card border-cyber-border",
          text: "text-cyber-text",
          badge: "bg-cyber-border text-cyber-muted border-transparent",
          glow: ""
        };
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="glass-panel rounded-lg p-5 flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-4 border-b border-cyber-border pb-3">
        <h2 className="text-base font-semibold tracking-wider text-cyber-primary flex items-center gap-2">
          <span>🧠</span> AI ON-CHAIN SIGNAL FEED
        </h2>
        <span className="text-xs text-cyber-muted font-mono">
          {signals.length} Signals Generated
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[500px]">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-cyber-muted text-xs font-mono border border-dashed border-cyber-border rounded">
            <span>NO SIGNALS CAPTURED YET</span>
            <span className="text-[10px] mt-1 text-cyber-muted/50">Listening for Mantle transactions...</span>
          </div>
        ) : (
          signals.map((sig) => {
            const style = getSignalStyles(sig.signal);
            const isExpanded = expandedId === sig.id;
            const timeStr = new Date(sig.timestamp).toLocaleTimeString();

            return (
              <div
                key={sig.id}
                className={`border rounded-lg transition-all duration-300 ${style.bg} ${
                  isExpanded ? "scale-[1.01]" : "hover:border-cyber-border/85 cursor-pointer"
                }`}
                onClick={() => !isExpanded && toggleExpand(sig.id)}
              >
                {/* Header Summary */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold border px-2.5 py-0.5 rounded ${style.badge}`}>
                      {sig.signal}
                    </span>
                    <span className="text-xs font-mono text-cyber-muted">{timeStr}</span>
                    <span className="text-xs font-semibold text-cyber-text hidden md:inline truncate max-w-[200px]">
                      {sig.value} MNT Move
                    </span>
                  </div>

                  <div className="flex items-center gap-3 justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-cyber-muted font-mono">CONFIDENCE:</span>
                      <div className="w-16 bg-cyber-bg h-1.5 rounded-full overflow-hidden border border-cyber-border">
                        <div
                          className={`h-full ${
                            sig.signal === "BUY"
                              ? "bg-cyber-emerald"
                              : sig.signal === "SELL"
                              ? "bg-cyber-rose"
                              : "bg-cyber-gold"
                          }`}
                          style={{ width: `${sig.confidence}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-mono font-bold ${style.text}`}>{sig.confidence}%</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(sig.id);
                      }}
                      className="text-cyber-muted hover:text-cyber-primary text-xs font-mono font-semibold"
                    >
                      {isExpanded ? "[ Collapse ]" : "[ Details ]"}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-cyber-border/40 pt-3 text-xs font-mono space-y-3 bg-cyber-bg/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-cyber-muted leading-relaxed">
                      <div>
                        <span className="text-cyber-primary font-bold block mb-1">🔍 ANALYSIS REASONING</span>
                        <p className="text-cyber-text text-justify">{sig.reasoning}</p>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-cyber-primary font-bold block mb-1">⚡ SUGGESTED ACTION</span>
                          <span className="text-cyber-text">{sig.action}</span>
                        </div>
                        <div className="pt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="block text-cyber-muted">FROM:</span>
                            <span className="text-cyber-text select-all break-all">{sig.fromAddress}</span>
                          </div>
                          <div>
                            <span className="block text-cyber-muted">TO:</span>
                            <span className="text-cyber-text select-all break-all">{sig.toAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-cyber-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-[10px]">
                      <div>
                        <span className="text-cyber-muted">Mantle Tx: </span>
                        <a
                          href={`https://explorer.mantle.xyz/tx/${sig.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyber-primary hover:underline font-bold"
                        >
                          {sig.txHash.slice(0, 12)}...{sig.txHash.slice(-8)} ↗
                        </a>
                      </div>
                      
                      <div className="sm:text-right">
                        <span className="text-cyber-muted">On-Chain Signal Hash: </span>
                        <span className="text-cyber-primary select-all font-bold">{sig.dataHash.slice(0,18)}...</span>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-cyber-muted">Verifiability Tx: </span>
                        {sig.onChainTxHash.startsWith("0x") && !sig.onChainTxHash.includes("(Simulated)") ? (
                          <a
                            href={`https://explorer.mantle.xyz/tx/${sig.onChainTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyber-primary hover:underline font-bold"
                          >
                            {sig.onChainTxHash.slice(0, 10)}...{sig.onChainTxHash.slice(-6)} ↗
                          </a>
                        ) : (
                          <span className="text-cyber-gold font-bold">{sig.onChainTxHash}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
