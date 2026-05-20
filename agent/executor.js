import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Token mints on Solana (adjust as needed)
const TOKENS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  SOL:  "So11111111111111111111111111111111111111112",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

const EXECUTION_MODE = process.env.EXECUTION_MODE || "mock";
const CONFIDENCE_THRESHOLD = parseInt(process.env.EXECUTION_CONFIDENCE_THRESHOLD || "75");

export async function executeSignal(signal) {
  const { signal: type, confidence } = signal;

  // Only act on high-confidence BUY or SELL
  if (type !== "BUY" && type !== "SELL") {
    return { skipped: true, reason: `Signal type ${type} — no execution needed` };
  }

  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      skipped: true,
      reason: `Confidence ${confidence}% below threshold ${CONFIDENCE_THRESHOLD}%`,
    };
  }

  if (EXECUTION_MODE === "mock") {
    return await _mockExecute(signal);
  }

  return await _liveExecute(signal);
}

async function _liveExecute(signal) {
  try {
    // Check Byreal CLI is available
    const checkCmd = process.platform === "win32" ? "where.exe byreal-cli" : "which byreal-cli";
    await execAsync(checkCmd);
  } catch {
    console.warn("[Executor] byreal-cli not found — falling back to mock");
    return _mockExecute(signal);
  }

  const tradeAmountUSD = 50; // $50 per trade — adjust in production

  try {
    if (signal.signal === "BUY") {
      // Buy SOL with USDC on Byreal
      const cmd = `byreal-cli swap execute \
        --input-mint ${TOKENS.USDC} \
        --output-mint ${TOKENS.SOL} \
        --amount ${tradeAmountUSD} \
        --slippage 1.0 \
        --confirm \
        -o json`;

      const { stdout } = await execAsync(cmd, { timeout: 30000 });
      const result = JSON.parse(stdout);

      return {
        executed: true,
        mode: "live",
        type: "BUY",
        platform: "Byreal (Solana)",
        amount: tradeAmountUSD,
        pair: "USDC → SOL",
        txSignature: result.signature || result.txId,
        explorerUrl: `https://solscan.io/tx/${result.signature || result.txId}`,
        timestamp: new Date().toISOString(),
      };
    }

    if (signal.signal === "SELL") {
      // Close perps position
      const cmd = `byreal-perps-cli position close --confirm -o json`;
      const { stdout } = await execAsync(cmd, { timeout: 30000 });
      const result = JSON.parse(stdout);

      return {
        executed: true,
        mode: "live",
        type: "SELL",
        platform: "Byreal Perps (Solana)",
        txSignature: result.signature || result.txId,
        explorerUrl: `https://solscan.io/tx/${result.signature || result.txId}`,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error("[Executor] Byreal execution error:", err.message);
    return {
      executed: false,
      error: err.message,
      fallback: await _mockExecute(signal),
    };
  }
}

async function _mockExecute(signal) {
  // Simulate realistic execution for demo/testing
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

  const mockSig = Array.from({ length: 88 }, () =>
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[
      Math.floor(Math.random() * 58)
    ]
  ).join("");

  const mockPnl = (Math.random() * 8 - 2).toFixed(2); // -2% to +6%

  return {
    executed: true,
    mode: "mock",
    type: signal.signal,
    platform: "Byreal CLMM (Solana) [SIMULATED]",
    amount: 50,
    pair: signal.signal === "BUY" ? "USDC → SOL" : "SOL → USDC",
    txSignature: mockSig,
    explorerUrl: `https://solscan.io/tx/${mockSig}`,
    pnlPercent: mockPnl,
    timestamp: new Date().toISOString(),
  };
}

export async function checkByrealInstalled() {
  try {
    const checkCmd = process.platform === "win32" ? "where.exe byreal-cli" : "which byreal-cli";
    await execAsync(checkCmd);
    const { stdout } = await execAsync("byreal-cli --version");
    return { installed: true, version: stdout.trim() };
  } catch {
    return { installed: false, version: null };
  }
}