import React, { useState } from "react";

export default function AgentStatus({ status, onToggleMock }) {
  const [loading, setLoading] = useState(false);

  const formatUptime = (seconds) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/toggle-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !status.mockMode })
      });
      const data = await response.json();
      if (data.success && onToggleMock) {
        onToggleMock(data.mockMode);
      }
    } catch (err) {
      console.error("Failed to toggle execution mode:", err);
    } finally {
      setLoading(false);
    }
  };

  const StatusRow = ({ label, value, isGreen, isPulse }) => (
    <div className="flex items-center justify-between border-b border-cyber-border py-2 text-xs font-mono">
      <span className="text-cyber-muted">{label}</span>
      <div className="flex items-center gap-1.5 font-bold">
        {isPulse && (
          <span className={`inline-block h-2 width-2 w-2 h-2 rounded-full ${isGreen ? 'bg-cyber-emerald animate-pulse-fast shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-cyber-rose animate-pulse-fast shadow-[0_0_8px_rgba(244,63,94,0.7)]'}`}></span>
        )}
        <span className={isGreen ? "text-cyber-primary" : "text-cyber-text"}>{value}</span>
      </div>
    </div>
  );

  return (
    <div className="glass-panel rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b border-cyber-border pb-3">
        <h2 className="text-base font-semibold tracking-wider text-cyber-primary flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-primary"></span>
          </span>
          TELEMETRY & HEARTBEAT
        </h2>
        <span className="text-[10px] bg-cyber-primary/10 text-cyber-primary border border-cyber-primary/30 px-2 py-0.5 rounded font-mono">
          ACTIVE
        </span>
      </div>

      <div className="flex-1 space-y-1">
        <StatusRow 
          label="Watcher Agent Uptime" 
          value={formatUptime(status.uptime)} 
          isGreen={false} 
        />
        <StatusRow 
          label="Blocks Scanned" 
          value={status.blocksScanned ? status.blocksScanned.toLocaleString() : "0"} 
          isGreen={true} 
          isPulse={true}
        />
        <StatusRow 
          label="Mantle Last Block" 
          value={status.lastBlock ? `#${status.lastBlock}` : "Syncing..."} 
          isGreen={false} 
        />
        <StatusRow 
          label="Mantle RPC Status" 
          value="Online (5000/5003)" 
          isGreen={true} 
        />
        <StatusRow 
          label="Claude Brain Model" 
          value={status.claudeStatus === "connected" ? "Claude 3.5 Sonnet" : "Deterministic Fallback"} 
          isGreen={status.claudeStatus === "connected"} 
        />
        <StatusRow 
          label="Telegram Alerts" 
          value={status.telegramBotStatus === "connected" ? "Live Broadcast" : "Log-only Mode"} 
          isGreen={status.telegramBotStatus === "connected"} 
        />
        <div className="border-b border-cyber-border py-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-cyber-muted">Signal Logger Address</span>
          </div>
          <div className="text-[10px] text-cyber-primary mt-1 break-all bg-cyber-bg/50 p-1.5 rounded border border-cyber-border/40 select-all">
            {status.loggerContractAddress}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-cyber-border pt-4">
        <label className="text-xs text-cyber-muted font-mono block mb-2">BYREAL SOLANA EXECUTION MODE</label>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`w-full py-2.5 px-4 rounded text-xs font-mono font-bold tracking-wider border transition-all duration-300 ${
            status.mockMode
              ? "bg-cyber-gold/10 hover:bg-cyber-gold/20 text-cyber-gold border-cyber-gold/40 hover:border-cyber-gold/60"
              : "bg-cyber-emerald/10 hover:bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/40 hover:border-cyber-emerald/60"
          }`}
        >
          {loading ? "COMMUNICATING..." : status.mockMode ? "⚠️ MOCK SWAPS ENABLED" : "⚡ REAL BYREAL SOLANA SWAPS ACTIVE"}
        </button>
        <span className="text-[10px] text-cyber-muted font-mono block mt-1 text-center leading-relaxed">
          {status.mockMode 
            ? "Executing simulated Solana trades for evaluation." 
            : "Requires loaded Byreal configuration and funded Solana wallets."}
        </span>
      </div>
    </div>
  );
}
