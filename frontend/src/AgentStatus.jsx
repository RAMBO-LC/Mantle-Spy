import { Activity, Cpu, Radio, Database, Zap } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function StatItem({ icon: Icon, label, value, color = "cyan" }) {
  const colors = {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    ghost: "text-slate-400",
  };
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <Icon size={14} className={colors[color]} />
      <span className="text-xs text-slate-400 font-body flex-1">{label}</span>
      <span className={`text-xs font-mono font-bold ${colors[color]}`}>{value}</span>
    </div>
  );
}

export default function AgentStatus({ stats, onChainCount, mode }) {
  const isLive = stats?.isRunning;

  return (
    <div className="panel panel-glow-cyan p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`heartbeat w-2 h-2 rounded-full ${isLive ? "bg-emerald-400" : "bg-rose-400"}`} />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            Agent Status
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-mono font-bold
          ${isLive
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
          <Radio size={10} />
          {isLive ? "LIVE" : "OFFLINE"}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-0">
        <StatItem icon={Activity} label="Blocks Scanned" value={stats?.blocksScanned?.toLocaleString() || "—"} color="cyan" />
        <StatItem icon={Zap} label="Last Block" value={stats?.lastBlockNumber ? `#${stats.lastBlockNumber.toLocaleString()}` : "—"} color="cyan" />
        <StatItem icon={Cpu} label="RPC Latency" value={stats?.latencyMs ? `${stats.latencyMs}ms` : "—"} color={stats?.latencyMs > 500 ? "rose" : "emerald"} />
        <StatItem icon={Radio} label="Tracked Wallets" value={stats?.trackedWallets ?? 0} color="amber" />
        <StatItem icon={Database} label="On-Chain Signals" value={onChainCount ?? 0} color="cyan" />
      </div>

      {/* Execution mode badge */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Execution Mode</span>
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border
            ${mode === "live"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}>
            {(mode || "mock").toUpperCase()}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">Contract</span>
          <a
            href={`https://sepolia.mantlescan.xyz`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors truncate max-w-[120px]"
          >
            View Explorer ↗
          </a>
        </div>
      </div>

      {/* Animated scan line */}
      <div className="relative mt-4 h-px bg-border overflow-hidden rounded">
        <div className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-scan" />
      </div>
    </div>
  );
}