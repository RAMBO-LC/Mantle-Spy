import React, { useState, useEffect, useRef } from "react";
import AgentStatus from "./components/AgentStatus";
import SignalFeed from "./components/SignalFeed";
import WalletTracker from "./components/WalletTracker";
import TradeHistory from "./components/TradeHistory";

const API_BASE = "http://localhost:3001";

export default function App() {
  const [status, setStatus] = useState({
    isRunning: false,
    blocksScanned: 0,
    lastBlockNumber: 0,
    latencyMs: 0,
    trackedWallets: 0,
    thresholdMNT: 10,
    rpcUrl: "",
    mode: "mock",
    signalCount: 0,
    executionCount: 0,
    onChainCount: 0,
  });
  const [signals, setSignals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [trackedWallets, setTrackedWallets] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Keep an up-to-date ref to signals so the onChainLog handler can patch them
  const signalsRef = useRef([]);
  signalsRef.current = signals;

  useEffect(() => {
    console.log("[App] Connecting to MantleSpy SSE stream…");
    const es = new EventSource(`${API_BASE}/api/stream`);

    es.onopen = () => {
      setIsConnected(true);
      console.log("[App] SSE connected");
    };

    es.onerror = () => {
      setIsConnected(false);
      console.warn("[App] SSE disconnected – retrying…");
    };

    // ── init: snapshot of current state ────────────────────────────────────
    es.addEventListener("init", (e) => {
      const d = JSON.parse(e.data);
      // d = { signals, executions, stats, onChainCount }
      if (d.stats)  setStatus((prev) => ({ ...prev, ...d.stats, onChainCount: d.onChainCount ?? 0 }));
      if (d.signals)    setSignals(d.signals.map(normalizeSignal));
      if (d.executions) setTrades(d.executions.map(normalizeExecution));
    });

    // ── stats: watcher heartbeat ────────────────────────────────────────────
    es.addEventListener("stats", (e) => {
      const d = JSON.parse(e.data);
      setStatus((prev) => ({ ...prev, ...d }));
    });

    // ── signal: new AI-analysed signal ─────────────────────────────────────
    es.addEventListener("signal", (e) => {
      const raw = JSON.parse(e.data);
      const sig = normalizeSignal(raw);
      setSignals((prev) => [sig, ...prev].slice(0, 100));
    });

    // ── execution: trade executed ───────────────────────────────────────────
    es.addEventListener("execution", (e) => {
      const raw = JSON.parse(e.data);
      const trade = normalizeExecution(raw);
      setTrades((prev) => [trade, ...prev].slice(0, 50));
    });

    // ── onChainLog: patch the matching signal with the on-chain tx hash ─────
    es.addEventListener("onChainLog", (e) => {
      const d = JSON.parse(e.data);
      // d = { onChainTxHash, signalId, ... }
      setSignals((prev) =>
        prev.map((sig, idx) => {
          // signalId is the 0-based index in state.signals on the server;
          // since we prepend new signals, the most-recent one is index 0
          if (typeof d.signalId === "number" && idx === d.signalId) {
            return { ...sig, onChainTxHash: d.onChainTxHash };
          }
          // Fallback: match by txHash if available
          if (sig.txHash && d.txHash && sig.txHash === d.txHash) {
            return { ...sig, onChainTxHash: d.onChainTxHash };
          }
          return sig;
        })
      );
    });

    // ── walletAdded / walletRemoved ─────────────────────────────────────────
    es.addEventListener("walletAdded", (e) => {
      const { address } = JSON.parse(e.data);
      setTrackedWallets((prev) =>
        prev.includes(address) ? prev : [...prev, address]
      );
    });

    es.addEventListener("walletRemoved", (e) => {
      const { address } = JSON.parse(e.data);
      setTrackedWallets((prev) => prev.filter((w) => w !== address));
    });

    // ── heartbeat: keep connection alive ────────────────────────────────────
    es.addEventListener("heartbeat", () => {
      setIsConnected(true);
    });

    // Also load initial wallet list via REST (SSE init doesn't include them)
    fetch(`${API_BASE}/api/wallets`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.wallets)) setTrackedWallets(d.wallets);
      })
      .catch((err) => console.warn("[App] Could not fetch wallets:", err));

    return () => es.close();
  }, []);

  // ── Prop callbacks ─────────────────────────────────────────────────────────
  const handleUpdateWallets = (newWallets) => {
    setTrackedWallets(newWallets);
    setStatus((prev) => ({ ...prev, trackedWallets: newWallets.length }));
  };

  return (
    <div className="min-h-screen bg-cyber-bg cyber-grid scanline relative text-cyber-text flex flex-col pb-10">
      {/* Top Banner Header */}
      <header className="border-b border-cyber-border/80 bg-cyber-bg/95 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyber-primary/15 border border-cyber-primary/40 p-2 rounded-lg flex items-center justify-center animate-pulse">
              <span className="text-xl">🧠</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold tracking-wider text-cyber-primary text-glow-cyan">
                MANTLE SPY
              </h1>
              <p className="text-[10px] md:text-xs text-cyber-muted font-mono tracking-widest mt-0.5">
                CROSS-CHAIN SMART MONEY WATCHER &amp; BYREAL SOLANA EXECUTION AGENT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cyber-muted font-mono">AGENT SYSTEM STATUS:</span>
              <div className="flex items-center gap-1.5 bg-cyber-bg border border-cyber-border rounded px-2.5 py-1 text-[10px] font-mono">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected
                      ? "bg-cyber-emerald animate-pulse-fast shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                      : "bg-cyber-rose animate-pulse-fast shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                  }`}
                ></span>
                <span className={isConnected ? "text-cyber-emerald" : "text-cyber-rose"}>
                  {isConnected ? "CONNECTED" : "DISCONNECTED"}
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-cyber-muted">
              <div>
                SIGNALS LOGGED:{" "}
                <span className="text-cyber-primary font-bold">{signals.length}</span>
              </div>
              <div className="text-cyber-border font-light">|</div>
              <div>
                TRADES EXECUTED:{" "}
                <span className="text-cyber-emerald font-bold">{trades.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-[1400px] mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full flex-1">
        {/* Telemetry Column */}
        <section className="lg:col-span-4 space-y-6 flex flex-col">
          <div className="flex-1">
            <AgentStatus status={status} />
          </div>
          <div>
            <WalletTracker
              wallets={trackedWallets}
              onAddWallet={handleUpdateWallets}
              onRemoveWallet={handleUpdateWallets}
            />
          </div>
        </section>

        {/* Action Center (Signals and Trade executions) */}
        <section className="lg:col-span-8 space-y-6">
          <div>
            <SignalFeed signals={signals} />
          </div>
          <div>
            <TradeHistory trades={trades} />
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Data normalisers ─────────────────────────────────────────────────────────
// Map backend field names → what the child components read

let _sigCounter = 0;

function normalizeSignal(raw) {
  return {
    // identity
    id: raw.id ?? `sig-${_sigCounter++}`,
    // type / confidence
    signal: raw.signal ?? "WATCH",
    confidence: raw.confidence ?? 0,
    smartMoneyScore: raw.smartMoneyScore ?? 0,
    riskLevel: raw.riskLevel ?? "MEDIUM",
    tags: raw.tags ?? [],
    // analysis
    reasoning: raw.reasoning ?? "",
    action: raw.action ?? "",
    // addresses
    fromAddress: raw.from ?? raw.fromAddress ?? "",
    toAddress: raw.to ?? raw.toAddress ?? "",
    // value
    value: raw.valueMNT ?? raw.value ?? "0",
    // hashes
    txHash: raw.txHash ?? "",
    dataHash: raw.dataHash ?? "0x",
    onChainTxHash: raw.onChainTxHash ?? "",
    // timing
    timestamp: raw.analyzedAt ?? raw.timestamp ?? new Date().toISOString(),
  };
}

let _execCounter = 0;

function normalizeExecution(raw) {
  const isMock = raw.mode === "mock";
  const txHash = raw.txSignature ?? raw.txHash ?? "";
  const pnl = raw.pnlPercent != null ? `${raw.pnlPercent > 0 ? "+" : ""}${raw.pnlPercent}%` : null;

  return {
    id: raw.id ?? `exec-${_execCounter++}`,
    type: raw.type ?? "BUY",
    signal: raw.signal ?? raw.type ?? "BUY",
    confidence: raw.confidence ?? 0,
    platform: raw.platform ?? "Byreal (Solana)",
    amount: raw.amount ?? 50,
    pair: raw.pair ?? (raw.type === "BUY" ? "USDC → SOL" : "SOL → USDC"),
    timestamp: raw.timestamp ?? new Date().toISOString(),
    result: {
      success: raw.executed ?? true,
      isMock,
      txHash,
      pnl,
      outputAmount: raw.outputAmount ?? null,
      error: raw.error ?? null,
      details: raw.platform ?? "",
    },
  };
}
