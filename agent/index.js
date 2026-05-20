import "dotenv/config";
import { MantleWatcher } from "./watcher.js";
import { analyzeTransaction } from "./analyzer.js";
import { executeSignal } from "./executor.js";
import { sendSignalAlert, sendStartupMessage, initBot } from "./notifier.js";
import { initOnChainLogger, logSignalOnChain, getSignalCount } from "./onchain.js";
import { startServer, state, broadcast } from "./server.js";

const PORT = parseInt(process.env.PORT || "3001");

async function main() {
  console.log(`
███╗   ███╗ █████╗ ███╗   ██╗████████╗██╗     ███████╗███████╗██████╗ ██╗   ██╗
████╗ ████║██╔══██╗████╗  ██║╚══██╔══╝██║     ██╔════╝██╔════╝██╔══██╗╚██╗ ██╔╝
██╔████╔██║███████║██╔██╗ ██║   ██║   ██║     █████╗  ███████╗██████╔╝ ╚████╔╝ 
██║╚██╔╝██║██╔══██║██║╚██╗██║   ██║   ██║     ██╔══╝  ╚════██║██╔═══╝   ╚██╔╝  
██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║   ███████╗███████╗███████║██║        ██║   
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝        ╚═╝   
  AI-Powered Smart Money Tracker for Mantle Network
  `);

  // ── Init on-chain logger ──────────────────────────────────────────────────
  const onChainEnabled = initOnChainLogger();
  if (onChainEnabled) {
    state.onChainCount = await getSignalCount();
    console.log(`[Init] On-chain signals logged so far: ${state.onChainCount}`);
  }

  // ── Init Mantle watcher ───────────────────────────────────────────────────
  const watcher = new MantleWatcher();
  await watcher.connect();

  // ── Init Telegram bot ─────────────────────────────────────────────────────
  initBot(
    (addr) => watcher.addTrackedWallet(addr),
    () => watcher.getStats()
  );

  // ── Start API server ──────────────────────────────────────────────────────
  startServer(PORT, watcher);

  // ── Wire up event handlers ────────────────────────────────────────────────
  watcher.on("block", (data) => {
    state.watcherStats = watcher.getStats();
    broadcast("stats", state.watcherStats);
  });

  watcher.on("flaggedTx", async (tx) => {
    console.log(`\n[Agent] Processing flagged tx: ${tx.hash.slice(0, 12)}...`);

    // 1. Analyze with Claude
    const signal = await analyzeTransaction(tx);
    console.log(`[Agent] Signal: ${signal.signal} (${signal.confidence}%) — ${signal.reasoning}`);

    // 2. Store signal
    state.signals.push(signal);
    if (state.signals.length > 100) state.signals.shift();

    // 3. Broadcast to dashboard
    broadcast("signal", signal);

    // 4. Log on-chain (non-blocking)
    if (onChainEnabled && signal.signal !== "IGNORE") {
      logSignalOnChain(signal).then((onChainResult) => {
        if (onChainResult) {
          state.onChainCount++;
          broadcast("onChainLog", { ...onChainResult, signalId: state.signals.length - 1 });
        }
      });
    }

    // 5. Execute trade if warranted
    const execution = await executeSignal(signal);
    if (execution && !execution.skipped) {
      console.log(`[Agent] Execution: ${execution.mode} ${execution.type} — ${execution.platform}`);
      state.executions.push({ ...execution, signal: signal.signal, confidence: signal.confidence });
      if (state.executions.length > 50) state.executions.shift();
      broadcast("execution", execution);
    }

    // 6. Send Telegram alert
    await sendSignalAlert(signal, execution?.skipped ? null : execution);
  });

  watcher.on("walletAdded", (addr) => {
    broadcast("walletAdded", { address: addr });
  });

  // ── Start watching ────────────────────────────────────────────────────────
  await watcher.start();
  await sendStartupMessage();

  console.log(`\n[Agent] ✅ MantleSpy is live!`);
  console.log(`[Agent] Dashboard: http://localhost:${PORT}`);
  console.log(`[Agent] Mode: ${process.env.EXECUTION_MODE || "mock"}\n`);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[Agent] Shutting down...");
    await watcher.stop();
    process.exit(0);
  });
}

main().catch(console.error);