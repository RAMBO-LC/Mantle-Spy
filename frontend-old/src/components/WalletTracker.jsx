import React, { useState } from "react";
import { Radio, Plus, X, Loader2 } from "lucide-react";

const API_BASE = "http://localhost:3001";

export default function WalletTracker({ wallets, onAddWallet, onRemoveWallet }) {
  const [newAddress, setNewAddress] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const addr = newAddress.trim();
    if (!addr) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError("Must be a valid 0x Ethereum address (42 chars)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/wallets`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // SSE will also fire walletAdded; optimistic update keeps UI snappy
        onAddWallet([...wallets, addr.toLowerCase()]);
        setNewAddress("");
      } else {
        setError(data.error || "Failed to add wallet");
      }
    } catch {
      setError("Network error — is the agent running on :3001?");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (address) => {
    try {
      await fetch(`${API_BASE}/api/wallets/${address}`, { method: "DELETE" });
      // SSE walletRemoved will handle the reactive update, but optimistic here too
      onRemoveWallet(wallets.filter((w) => w !== address));
    } catch (err) {
      console.error("Remove wallet error:", err);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border">
        <h2 className="text-xs font-mono font-bold text-cyber-text uppercase tracking-widest flex items-center gap-2">
          <Radio size={13} className="text-cyber-primary" />
          Smart Wallet Tracker
        </h2>
        <span className="text-[10px] text-cyber-muted font-mono">
          {wallets.length} watching
        </span>
      </div>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <label className="text-[10px] text-cyber-muted font-mono block mb-1.5 tracking-wider">
          ADD MANTLE WALLET
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="0x…"
            value={newAddress}
            onChange={(e) => { setNewAddress(e.target.value); setError(""); }}
            disabled={loading}
            className="flex-1 bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-[11px] font-mono text-cyber-text focus:outline-none focus:border-cyber-primary/70 focus:ring-1 focus:ring-cyber-primary/20 placeholder:text-cyber-muted/30 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 bg-cyber-primary/10 border border-cyber-primary/40 hover:bg-cyber-primary/20 hover:border-cyber-primary/60 text-cyber-primary text-[11px] font-mono font-bold px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {loading
              ? <Loader2 size={12} className="animate-spin" />
              : <Plus size={12} />
            }
            {loading ? "Adding…" : "Track"}
          </button>
        </div>
        {error && (
          <p className="text-cyber-rose font-mono text-[10px] mt-1.5 flex items-center gap-1">
            <X size={10} /> {error}
          </p>
        )}
      </form>

      {/* Wallet list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[200px]">
        {wallets.length === 0 ? (
          <p className="text-[11px] font-mono text-cyber-muted/60 text-center py-6">
            No wallets being tracked yet
          </p>
        ) : (
          wallets.map((wallet) => (
            <div
              key={wallet}
              className="flex items-center justify-between bg-cyber-bg/60 border border-cyber-border/60 rounded-lg px-3 py-2 group hover:border-cyber-border transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary shadow-[0_0_6px_rgba(6,243,216,0.8)] flex-shrink-0" />
                <span
                  className="text-[11px] font-mono text-cyber-text truncate"
                  title={wallet}
                >
                  {wallet.slice(0, 10)}…{wallet.slice(-8)}
                </span>
              </div>
              <button
                onClick={() => handleRemove(wallet)}
                className="ml-2 text-cyber-muted/40 hover:text-cyber-rose transition-colors duration-200 flex-shrink-0"
                title="Stop tracking"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
