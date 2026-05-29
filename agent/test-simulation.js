/**
 * MantleSpy Test Simulation
 * Full pipeline:
 * AI → Execution → On-chain → Telegram
 */

import "dotenv/config";

import { analyzeTransaction } from "./analyzer.js";
import { executeSignal } from "./executor.js";
import {
  sendSignalAlert,
  initBot
} from "./notifier.js";

import {
  initOnChainLogger,
  logSignalOnChain
} from "./onchain.js";

// ========================================
// Mock Transactions
// ========================================

const MOCK_TRANSACTIONS = [
  {
    hash:
      "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",

    from:
      "0xDeadBeefCafe0000000000000000000000000001",

    to:
      "0x1F98431c8aD98523631AE4a59f267346ea31F984",

    valueMNT: 250,

    gasPrice: 0.001,

    isContract: true,

    logsCount: 4,

    reason: "large_transfer",

    blockNumber: 12345678,

    timestamp: new Date().toISOString(),
  },

  {
    hash:
      "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456789012",

    from:
      "0xWhaleWallet000000000000000000000000000002",

    to:
      "0xMantleDeFiProtocol000000000000000000000",

    valueMNT: 5000,

    gasPrice: 0.002,

    isContract: true,

    logsCount: 8,

    reason: "tracked_wallet_outflow",

    blockNumber: 12345679,

    timestamp: new Date().toISOString(),
  },

  {
    hash:
      "0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12345678901234",

    from:
      "0xSmallWallet000000000000000000000000000003",

    to:
      "0xRegularWallet000000000000000000000000000",

    valueMNT: 12.5,

    gasPrice: 0.001,

    isContract: false,

    logsCount: 1,

    reason: "small_transfer",

    blockNumber: 12345680,

    timestamp: new Date().toISOString(),
  },
];

// ========================================
// Main Simulation
// ========================================

async function runSimulation() {
  console.log(
    "\n🧪 MantleSpy Test Simulation Starting...\n"
  );

  console.log(
    `Mode: ${
      process.env.EXECUTION_MODE || "mock"
    }`
  );

  console.log(
    `Groq API: ${
      process.env.GROQ_API_KEY
        ? "✅ Connected"
        : "❌ Missing"
    }`
  );

  console.log(
    `Telegram: ${
      process.env.TELEGRAM_BOT_TOKEN
        ? "✅ Connected"
        : "❌ Missing"
    }`
  );

  console.log(
    `On-chain Logger: ${
      process.env.PRIVATE_KEY &&
      process.env.SIGNAL_LOGGER_ADDRESS
        ? "✅ Ready"
        : "❌ Disabled"
    }\n`
  );

  // ========================================
  // Init Services
  // ========================================

  initBot(null, null, { polling: false });

  const onChainEnabled =
    initOnChainLogger();

  let passed = 0;
  let failed = 0;

  // ========================================
  // Run Tests
  // ========================================

  for (let i = 0; i < MOCK_TRANSACTIONS.length; i++) {
    const tx = MOCK_TRANSACTIONS[i];

    console.log(
      `\n─── Test ${
        i + 1
      }/${MOCK_TRANSACTIONS.length} ─────────────────────────────`
    );

    console.log(
      `TX: ${tx.hash.slice(
        0,
        14
      )}... | ${tx.valueMNT} MNT | ${
        tx.reason
      }`
    );

    try {
      // ========================================
      // STEP 1 — AI ANALYSIS
      // ========================================

      process.stdout.write(
        "  [1/4] Groq Analysis... "
      );

      const signal =
        await analyzeTransaction(tx);

      console.log(
        `✅ ${signal.signal} (${signal.confidence}%)`
      );

      console.log(
        `       Score: ${signal.smartMoneyScore}/100`
      );

      console.log(
        `       Risk: ${signal.riskLevel}`
      );

      console.log(
        `       Reason: ${signal.reasoning}`
      );

      // ========================================
      // STEP 2 — EXECUTION
      // ========================================

      process.stdout.write(
        "  [2/4] Byreal Execution... "
      );

      const execution =
        await executeSignal(signal);

      if (execution?.skipped) {
        console.log(
          `⏭ Skipped (${execution.reason})`
        );
      } else {
        console.log(
          `✅ ${execution?.mode || "mock"}`
        );
      }

      // ========================================
      // STEP 3 — ON-CHAIN LOGGING
      // ========================================

      if (
        onChainEnabled &&
        signal.signal !== "IGNORE"
      ) {
        process.stdout.write(
          "  [3/4] On-chain Logging... "
        );

        const onChainResult =
          await logSignalOnChain(signal);

        if (onChainResult) {
          console.log(
            `✅ ${onChainResult.onChainTxHash.slice(
              0,
              14
            )}...`
          );
        } else {
          console.log("⚠️ Failed");
        }
      } else {
        console.log(
          "  [3/4] On-chain Logging... ⏭ Disabled"
        );
      }

      // ========================================
      // STEP 4 — TELEGRAM ALERT
      // ========================================

      process.stdout.write(
        "  [4/4] Telegram Alert... "
      );

      await sendSignalAlert(
        signal,
        execution?.skipped
          ? null
          : execution
      );

      console.log(
        process.env.TELEGRAM_BOT_TOKEN
          ? "✅ Sent"
          : "⏭ Disabled"
      );

      passed++;
    } catch (err) {
      failed++;

      console.error(
        `\n❌ Simulation Error: ${err.message}`
      );
    }

    // Delay between tests
    if (
      i < MOCK_TRANSACTIONS.length - 1
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
    }
  }

  // ========================================
  // Summary
  // ========================================

  console.log(
    "\n─────────────────────────────────────────────"
  );

  console.log(
    `✅ Passed: ${passed}/${MOCK_TRANSACTIONS.length}`
  );

  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }

  console.log(
    "\n🏁 MantleSpy simulation complete.\n"
  );

  process.exit(0);
}

// ========================================
// Boot
// ========================================

runSimulation().catch((err) => {
  console.error(
    "\n🔥 Fatal Simulation Error:"
  );

  console.error(err);

  process.exit(1);
});