import React, { useState } from "react";

export default function WalletTracker({ wallets, onAddWallet, onRemoveWallet }) {
  const [newAddress, setNewAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/api/tracked-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        onAddWallet(data.wallets);
        setNewAddress("");
      } else {
        setError(data.error || "Failed to add wallet");
      }
    } catch (err) {
      setError("Network error adding wallet");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (address) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tracked-wallets/${address}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (response.ok) {
        onRemoveWallet(data.wallets);
      }
    } catch (err) {
      console.error("Failed to remove wallet:", err);
    }
  };

  return (
    <div className="glass-panel rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b border-cyber-border pb-3">
        <h2 className="text-base font-semibold tracking-wider text-cyber-primary flex items-center gap-2">
          <span>📡</span> SMART WALLET TRACKER
        </h2>
        <span className="text-xs text-cyber-muted font-mono">{wallets.length} Watching</span>
      </div>

      {/* Add Wallet Form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <label className="text-[10px] text-cyber-muted font-mono block mb-1">ADD MANTLE WALLET TO TRACK</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="0x..."
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            disabled={loading}
            className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 text-xs font-mono text-cyber-text focus:outline-none focus:border-cyber-primary/70 placeholder:text-cyber-muted/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-cyber-primary/10 border border-cyber-primary/40 hover:bg-cyber-primary/20 text-cyber-primary text-xs font-mono font-bold px-4 py-2 rounded transition-all duration-300"
          >
            {loading ? "ADDING..." : "TRACK"}
          </button>
        </div>
        {error && <p className="text-cyber-rose font-mono text-[10px] mt-1.5">{error}</p>}
      </form>

      {/* Wallets List */}
      <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2">
        {wallets.length === 0 ? (
          <p className="text-xs font-mono text-cyber-muted text-center py-4">No wallets tracked yet.</p>
        ) : (
          wallets.map((wallet) => (
            <div
              key={wallet}
              className="flex items-center justify-between bg-cyber-bg/50 border border-cyber-border/70 rounded p-2.5 text-xs font-mono group"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary shadow-[0_0_6px_rgba(6,243,216,0.8)]"></span>
                <span className="text-cyber-text truncate text-[11px]" title={wallet}>
                  {wallet.slice(0, 10)}...{wallet.slice(-8)}
                </span>
              </div>
              <button
                onClick={() => handleRemove(wallet)}
                className="text-cyber-muted hover:text-cyber-rose transition-colors duration-200 text-[10px] ml-2"
              >
                [ REMOVE ]
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
