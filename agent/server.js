import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));

// ─── In-memory state (replace with DB for production) ──────────────────────
export const state = {
  signals: [],        // last 100 signals
  executions: [],     // last 50 trade executions
  watcherStats: {},
  onChainCount: 0,
  sseClients: [],     // active SSE connections
};

// ─── SSE broadcast ────────────────────────────────────────────────────────────
export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  state.sseClients = state.sseClients.filter((res) => {
    try {
      res.write(payload);
      return true;
    } catch {
      return false;
    }
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// SSE stream endpoint
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send current state immediately on connect
  res.write(`event: init\ndata: ${JSON.stringify({
    signals: state.signals.slice(-20),
    executions: state.executions.slice(-10),
    stats: state.watcherStats,
    onChainCount: state.onChainCount,
  })}\n\n`);

  state.sseClients.push(res);

  // Heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 10000);

  req.on("close", () => {
    clearInterval(heartbeat);
    state.sseClients = state.sseClients.filter((c) => c !== res);
  });
});

// REST endpoints
app.get("/api/status", (req, res) => {
  res.json({
    ...state.watcherStats,
    onChainCount: state.onChainCount,
    signalCount: state.signals.length,
    executionCount: state.executions.length,
    mode: process.env.EXECUTION_MODE || "mock",
    connectedClients: state.sseClients.length,
  });
});

app.get("/api/signals", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(state.signals.slice(-limit).reverse());
});

app.get("/api/executions", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(state.executions.slice(-limit).reverse());
});

app.get("/api/wallets", (req, res) => {
  // Watcher instance injected at startup
  res.json({ wallets: app.locals.watcher?.getTrackedWallets() || [] });
});

app.post("/api/wallets", (req, res) => {
  const { address } = req.body;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  app.locals.watcher?.addTrackedWallet(address);
  broadcast("walletAdded", { address });
  res.json({ success: true, address });
});

app.delete("/api/wallets/:address", (req, res) => {
  app.locals.watcher?.removeTrackedWallet(req.params.address);
  broadcast("walletRemoved", { address: req.params.address });
  res.json({ success: true });
});

export function startServer(port = 3001, watcher = null) {
  app.locals.watcher = watcher;
  app.listen(port, () => {
    console.log(`[Server] Dashboard API running on http://localhost:${port}`);
  });
  return app;
}