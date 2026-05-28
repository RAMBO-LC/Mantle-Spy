import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Brain } from "lucide-react";

// ── Signal type config ────────────────────────────────────────────────────────
const SIGNAL_CONFIG = {
  BUY:    { badge: "bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/50", dot: "bg-cyber-emerald", bar: "#10B981" },
  SELL:   { badge: "bg-cyber-rose/20 text-cyber-rose border-cyber-rose/50",         dot: "bg-cyber-rose",    bar: "#F43F5E" },
  WATCH:  { badge: "bg-cyber-gold/20 text-cyber-gold border-cyber-gold/50",         dot: "bg-cyber-gold",    bar: "#F59E0B" },
  IGNORE: { badge: "bg-cyber-border text-cyber-muted border-transparent",           dot: "bg-cyber-muted",   bar: "#6B7280" },
};

const RISK_COLOR = {
  LOW:    "text-cyber-emerald",
  MEDIUM: "text-cyber-gold",
  HIGH:   "text-cyber-rose",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── Single signal card ────────────────────────────────────────────────────────
function SignalCard({ sig }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SIGNAL_CONFIG[sig.signal] || SIGNAL_CONFIG.WATCH;

  const hasRealOnChain =
    sig.onChainTxHash &&
    sig.onChainTxHash.startsWith("0x") &&
    !sig.onChainTxHash.includes("Simulated");

  return (
    <div className="border border-cyber-border/60 rounded-lg overflow-hidden transition-all duration-200 hover:border-cyber-border bg-cyber-card/40">
      {/* Collapsed row */}
      <div
        className="p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {/* Signal dot */}
          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} shadow-[0_0_6px_currentColor]`} />

          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold border px-2 py-0.5 rounded ${cfg.badge}`}>
                {sig.signal}
              </span>
              <span className="text-[11px] text-cyber-muted font-mono">
                {sig.value} MNT
              </span>
              {sig.riskLevel && (
                <span className={`text-[10px] font-mono ml-auto ${RISK_COLOR[sig.riskLevel] || "text-cyber-muted"}`}>
                  {sig.riskLevel} RISK
                </span>
              )}
            </div>

            {/* Confidence bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-cyber-bg rounded-full overflow-hidden border border-cyber-border/40">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${sig.confidence}%`,
                    backgroundColor: cfg.bar,
                    boxShadow: `0 0 6px ${cfg.bar}88`,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: cfg.bar }}>
                {sig.confidence}%
              </span>
            </div>

            {/* From / To / time */}
            <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-cyber-muted">
              <span>
                from: <span className="text-cyber-text">{shortAddr(sig.fromAddress)}</span>
              </span>
              <span>→</span>
              <span className="text-cyber-text">{shortAddr(sig.toAddress)}</span>
              <span className="ml-auto">{timeAgo(sig.timestamp)}</span>
            </div>
          </div>

          <button className="text-cyber-muted hover:text-cyber-primary flex-shrink-0 ml-1">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-cyber-border/40 pt-3 space-y-3 bg-cyber-bg/30">
          {/* Reasoning */}
          <div className="flex items-start gap-2">
            <Brain size={12} className="text-cyber-primary mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-cyber-text leading-relaxed">{sig.reasoning || "—"}</p>
          </div>

          {/* Action */}
          {sig.action && (
            <div className="text-[11px] font-mono text-cyber-muted">
              <span className="text-cyber-gold">Action: </span>
              <span className="text-cyber-text">{sig.action}</span>
            </div>
          )}

          {/* Smart money score */}
          {sig.smartMoneyScore != null && (
            <div className="text-[10px] font-mono text-cyber-muted">
              Smart Money Score:{" "}
              <span className="text-cyber-primary font-bold">{sig.smartMoneyScore}/100</span>
            </div>
          )}

          {/* Tags */}
          {sig.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sig.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-mono bg-cyber-primary/10 border border-cyber-primary/20 text-cyber-primary px-1.5 py-0.5 rounded"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-cyber-border/30">
            {sig.txHash && (
              <a
                href={`https://mantlescan.xyz/tx/${sig.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-cyber-primary hover:text-cyber-primary/80 transition-colors"
              >
                <ExternalLink size={10} /> Mantle TX
              </a>
            )}
            {sig.dataHash && sig.dataHash !== "0x" && (
              <span className="text-[10px] font-mono text-cyber-muted/70 truncate max-w-[180px]">
                hash: {sig.dataHash.slice(0, 14)}…
              </span>
            )}
            {hasRealOnChain ? (
              <a
                href={`https://explorer.mantle.xyz/tx/${sig.onChainTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-cyber-emerald hover:text-cyber-emerald/80 transition-colors ml-auto"
              >
                <ExternalLink size={10} /> On-Chain ✓
              </a>
            ) : sig.onChainTxHash ? (
              <span className="text-[10px] font-mono text-cyber-gold ml-auto">{sig.onChainTxHash}</span>
            ) : (
              <span className="text-[10px] font-mono text-cyber-muted/40 ml-auto">Awaiting on-chain log…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main feed ─────────────────────────────────────────────────────────────────
const FILTERS = ["ALL", "BUY", "SELL", "WATCH", "IGNORE"];

export default function SignalFeed({ signals }) {
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL"
    ? signals
    : signals.filter((s) => s.signal === filter);

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border flex-shrink-0">
        <h2 className="text-xs font-mono font-bold text-cyber-text uppercase tracking-widest flex items-center gap-2">
          <Brain size={13} className="text-cyber-primary" />
          AI Signal Feed
          <span className="text-cyber-muted font-normal">({filtered.length})</span>
        </h2>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                filter === f
                  ? "bg-cyber-primary/10 border-cyber-primary/40 text-cyber-primary"
                  : "border-cyber-border/60 text-cyber-muted hover:text-cyber-text"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-2 max-h-[520px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="w-10 h-10 rounded-full border border-cyber-border flex items-center justify-center">
              <Brain size={18} className="text-cyber-muted/40" />
            </div>
            <p className="text-[11px] text-cyber-muted font-mono">
              {filter === "ALL" ? "Awaiting signals…" : `No ${filter} signals yet`}
            </p>
          </div>
        ) : (
          filtered.map((sig) => <SignalCard key={sig.id} sig={sig} />)
        )}
      </div>
    </div>
  );
}
