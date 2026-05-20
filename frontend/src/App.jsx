import React, { useState, useEffect } from "react";
import AgentStatus from "./components/AgentStatus";
import SignalFeed from "./components/SignalFeed";
import WalletTracker from "./components/WalletTracker";
import TradeHistory from "./components/TradeHistory";

export default function App() {
  const [status, setStatus] = useState({
    uptime: 0,
    blocksScanned: 0,
    lastBlock: 0,
    mockMode: true,
    trackedWalletsCount: 0,
    signalsCount: 0,
    loggerContractAddress: "Loading...",
    rpcUrl: "Loading...",
    telegramBotStatus: "Loading...",
    claudeStatus: "Loading..."
  });
  const [signals, setSignals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [trackedWallets, setTrackedWallets] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log("Connecting to Mantle Spy SSE stream...");
    const eventSource = new EventSource("http://localhost:3001/api/events");

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("SSE connected!");
    };

    eventSource.onerror = (err) => {
      setIsConnected(false);
      console.error("SSE connection error, retrying...", err);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received Event:", data.type);

        switch (data.type) {
          case "INIT":
            setStatus(data.status);
            setSignals(data.signals);
            setTrades(data.executions);
            setTrackedWallets(data.trackedWallets);
            break;
          case "STATUS_UPDATED":
          case "TELEMETRY_UPDATED":
            setStatus(data.status);
            break;
          case "NEW_SIGNAL":
            setSignals((prev) => [data.signal, ...prev]);
            break;
          case "NEW_TRADE":
            setTrades((prev) => [data.trade, ...prev]);
            break;
          case "TRACKED_WALLETS_UPDATED":
            setTrackedWallets(data.wallets);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("Failed to parse event message:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleToggleMock = (newMockMode) => {
    setStatus((prev) => ({ ...prev, mockMode: newMockMode }));
  };

  const handleUpdateWallets = (newWallets) => {
    setTrackedWallets(newWallets);
    setStatus((prev) => ({ ...prev, trackedWalletsCount: newWallets.length }));
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
                CROSS-CHAIN SMART MONEY WATCHER & SOLANA EXECUTION AGENT
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
                SIGNALS LOGGED: <span className="text-cyber-primary font-bold">{signals.length}</span>
              </div>
              <div className="text-cyber-border font-light">|</div>
              <div>
                TRADES EXECUTED: <span className="text-cyber-emerald font-bold">{trades.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-[1400px] mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full flex-1">
        {/* Telemetry Column */}
        <section className="lg:col-span-4 space-y-6 flex flex-col justify-between">
          <div className="flex-1">
            <AgentStatus status={status} onToggleMock={handleToggleMock} />
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
