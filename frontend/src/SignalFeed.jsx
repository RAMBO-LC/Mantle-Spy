import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Brain } from "lucide-react";

const SIGNAL_CONFIG = {
  BUY:    { badge: "badge-buy",    dot: "bg-emerald-400", bar: "#00ff88", label: "BUY" },
  SELL:   { badge: "badge-sell",   dot: "bg-rose-400",    bar: "#ff3366", label: "SELL" },
  WATCH:  { badge: "badge-watch",  dot: "bg-amber-400",   bar: "#ffaa00", label: "WATCH" },
  IGNORE: { badge: "badge-ignore", dot: "bg-slate-600",   bar: "#4b5563", label: "IGNORE" },
};

const RISK_COLOR = { LOW: "text-emerald-400", MEDIUM: "text-amber-400", HIGH: "text-rose-400" };

function SignalCard({ signal, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SIGNAL_CONFIG[signal.signal] || SIGNAL_CONFIG.WATCH;

  const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";
  const timeAgo = (iso) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className={`panel mb-2 overflow-hidden transition-all duration-200 ${isNew ? "signal-enter" : ""}`}>
      <div
        className="p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {/* Signal dot */}
          <div className={`ticker-dot mt-1 ${cfg.dot}`} />

          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cfg.badge}>{cfg.label}</span>
              <span className="text-xs text-slate-500 font-mono">
                {signal.valueMNT} MNT
              </span>
              <span className={`text-xs font-mono ml-auto ${RISK_COLOR[signal.riskLevel] || "text-slate-400"}`}>
                Risk: {signal.riskLevel}
              </span>
            </div>

            {/* Confidence bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${signal.confidence}%`,
                    backgroundColor: cfg.bar,
                    boxShadow: `0 0 8px ${cfg.bar}88`,
                  }}
                />
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: cfg.bar }}>
                {signal.confidence}%
              </span>
            </div>

            {/* From/To */}
            <div className="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-500">
              <span>from: <span className="text-slate-300">{short(signal.from)}</span></span>
              <span>→</span>
              <span><span className="text-slate-300">{short(signal.to)}</span></span>
              <span className="ml-auto">{timeAgo(signal.analyzedAt)}</span>
            </div>
          </div>

          <button className="text-slate-600 hover:text-slate-400 flex-shrink-0">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 pt-3 space-y-2">
          <div className="flex items-start gap-2">
            <Brain size={12} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">{signal.reasoning}</p>
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-amber-400 font-mono">Action: </span>
            {signal.action}
          </div>
          {signal.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {signal.tags.map((t) => (
                <span key={t} className="text-xs font-mono bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <a
              href={`https://mantlescan.xyz/tx/${signal.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink size={10} /> View TX
            </a>
            {signal.dataHash && (
              <span className="text-xs font-mono text-slate-600 truncate max-w-[200px]">
                hash: {signal.dataHash.slice(0, 14)}...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignalFeed({ signals }) {
  const [filter, setFilter] = useState("ALL");
  const filters = ["ALL", "BUY", "SELL", "WATCH"];

  const filtered = signals.filter(
    (s) => filter === "ALL" || s.signal === filter
  );

  return (
    <div className="panel p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 heartbeat" />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            Signal Feed
          </span>
          <span className="text-xs font-mono text-slate-600">
            ({filtered.length})
          </span>
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-mono px-2 py-0.5 rounded border transition-all
                ${filter === f
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                  : "border-white/10 text-slate-500 hover:text-slate-300"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
              <Brain size={16} className="text-slate-600" />
            </div>
            <p className="text-xs text-slate-600 font-mono">Awaiting signals...</p>
          </div>
        ) : (
          filtered.map((signal, i) => (
            <SignalCard
              key={signal.txHash + i}
              signal={signal}
              isNew={i === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}