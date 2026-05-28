import React from "react";
import { Activity, Cpu, Radio, Database, Zap, Shield, TrendingUp } from "lucide-react";

function StatRow({ icon: Icon, label, value, color = "cyan", pulse = false }) {
  const colorMap = {
    cyan:   { text: "text-cyber-primary",  bg: "bg-cyber-primary/10",  dot: "bg-cyber-primary" },
    emerald:{ text: "text-cyber-emerald",  bg: "bg-cyber-emerald/10",  dot: "bg-cyber-emerald" },
    gold:   { text: "text-cyber-gold",     bg: "bg-cyber-gold/10",     dot: "bg-cyber-gold" },
    rose:   { text: "text-cyber-rose",     bg: "bg-cyber-rose/10",     dot: "bg-cyber-rose" },
    muted:  { text: "text-cyber-muted",    bg: "",                     dot: "bg-cyber-muted" },
  };
  const c = colorMap[color] || colorMap.muted;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-cyber-border/60 last:border-0">
      <Icon size={13} className={c.text} />
      <span className="text-[11px] text-cyber-muted font-mono flex-1 tracking-wide">{label}</span>
      <div className="flex items-center gap-1.5">
        {pulse && (
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse-fast`} />
        )}
        <span className={`text-[11px] font-mono font-bold ${c.text}`}>{value}</span>
      </div>
    </div>
  );
}

export default function AgentStatus({ status }) {
  const isLive   = status.isRunning;
  const mode     = status.mode || "mock";
  const latency  = status.latencyMs;
  const latencyColor = !latency ? "muted" : latency < 500 ? "emerald" : latency < 2000 ? "gold" : "rose";

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <div className={`relative flex h-2.5 w-2.5`}>
            {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-emerald opacity-60" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? "bg-cyber-emerald" : "bg-cyber-rose"}`} />
          </div>
          <h2 className="text-xs font-mono font-bold text-cyber-text uppercase tracking-widest">
            Telemetry &amp; Heartbeat
          </h2>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
          isLive
            ? "bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald"
            : "bg-cyber-rose/10 border-cyber-rose/30 text-cyber-rose"
        }`}>
          {isLive ? "● LIVE" : "○ IDLE"}
        </span>
      </div>

      {/* Stats */}
      <div className="flex-1 space-y-0">
        <StatRow icon={Activity}   label="Blocks Scanned"   value={status.blocksScanned?.toLocaleString() || "0"} color="cyan" pulse={isLive} />
        <StatRow icon={Zap}        label="Last Block"        value={status.lastBlockNumber ? `#${status.lastBlockNumber.toLocaleString()}` : "Syncing…"} color="cyan" />
        <StatRow icon={Cpu}        label="RPC Latency"       value={latency != null ? `${latency} ms` : "—"} color={latencyColor} />
        <StatRow icon={Radio}      label="Tracked Wallets"   value={status.trackedWallets ?? 0} color="gold" />
        <StatRow icon={TrendingUp} label="Signal Threshold"  value={status.thresholdMNT ? `${status.thresholdMNT} MNT` : "10 MNT"} color="muted" />
        <StatRow icon={Database}   label="On-Chain Signals"  value={status.onChainCount ?? 0} color="cyan" />
        <StatRow icon={Shield}     label="AI Brain"          value="Groq · qwen3-32b" color="cyan" />
      </div>

      {/* RPC URL */}
      {status.rpcUrl && (
        <div className="mt-3 pt-3 border-t border-cyber-border/60">
          <p className="text-[10px] text-cyber-muted font-mono mb-1">MANTLE RPC</p>
          <p className="text-[10px] text-cyber-primary font-mono truncate select-all bg-cyber-bg/60 px-2 py-1 rounded border border-cyber-border/40">
            {status.rpcUrl}
          </p>
        </div>
      )}

      {/* Execution mode */}
      <div className="mt-4 pt-3 border-t border-cyber-border">
        <p className="text-[10px] text-cyber-muted font-mono mb-2 tracking-widest">BYREAL EXECUTION MODE</p>
        <div className={`text-center text-[11px] font-mono font-bold py-2 px-3 rounded border ${
          mode === "mock"
            ? "bg-cyber-gold/10 border-cyber-gold/40 text-cyber-gold"
            : "bg-cyber-emerald/10 border-cyber-emerald/40 text-cyber-emerald"
        }`}>
          {mode === "mock" ? "⚠ MOCK SWAPS ACTIVE" : "⚡ LIVE BYREAL SWAPS"}
        </div>
        <p className="text-[10px] text-cyber-muted/60 font-mono mt-1 text-center">
          {mode === "mock" ? "Simulated trades — safe for demo" : "Real Solana execution via Byreal CLI"}
        </p>
      </div>

      {/* Animated scan line */}
      <div className="relative mt-4 h-px bg-cyber-border overflow-hidden rounded-full">
        <div className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-cyber-primary/70 to-transparent animate-[scan_2s_linear_infinite]" />
      </div>
    </div>
  );
}
