/**
 * MantleSpy Test Simulation
 * Feeds mock Mantle transactions through the full pipeline:
 * analyzer → executor → notifier → SSE broadcast
 * Run: node agent/test-simulation.js
 */
import "dotenv/config";
import { analyzeTransaction } from "./analyzer.js";
import { executeSignal } from "./executor.js";
import { sendSignalAlert, initBot } from "./notifier.js";
import { initOnChainLogger, logSignalOnChain } from "./onchain.js";

const MOCK_TRANSACTIONS = [
  {
    hash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
    from: "0xDeadBeefCafe0000000000000000000000000001",
    to: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Uniswap-style address
    valueMNT: "250.0000",
    gasPrice: "0.001",
    isContract: true,
    logsCount: 4,
    reason: "large_transfer",
    blockNumber: 12345678,
    timestamp: new Date().toISOString(),
  },
  {
    hash: "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456789012",
    from: "0xWhaleWallet000000000000000000000000000002",
    to: "0xMantleDeFiProtocol000000000000000000000",
    valueMNT: "5000.0000",
    gasPrice: "0.002",
    isContract: true,
    logsCount: 8,
    reason: "tracked_wallet_outflow",
    blockNumber: 12345679,
    timestamp: new Date().toISOString(),
  },
  {
    hash: "0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12345678901234",
    from: "0xSmallWallet000000000000000000000000000003",
    to: "0xRegularWallet000000000000000000000000000",
    valueMNT: "12.5000",
    gasPrice: "0.001",
    isContract: false,
    logsCount: 1,
    reason: "large_transfer",
    blockNumber: 12345680,
    timestamp: new Date().toISOString(),
  },
];

async function runSimulation() {
  console.log("🧪 MantleSpy Test Simulation Starting...\n");
  console.log(`Mode: ${process.env.EXECUTION_MODE || "mock"}`);
  console.log(`Claude API: ${process.env.ANTHROPIC_API_KEY ? "✅" : "❌ Not set"}`);
  console.log(`Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? "✅" : "❌ Not set"}`);
  console.log(`On-chain: ${process.env.PRIVATE_KEY && process.env.SIGNAL_LOGGER_ADDRESS ? "✅" : "❌ Not set"}\n`);

  // Init optional services
  initBot(null, null);
  const onChainEnabled = initOnChainLogger();

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < MOCK_TRANSACTIONS.length; i++) {
    const tx = MOCK_TRANSACTIONS[i];
    console.log(`─── Test ${i + 1}/${MOCK_TRANSACTIONS.length} ─────────────────────────────`);
    console.log(`TX: ${tx.hash.slice(0, 14)}... | ${tx.valueMNT} MNT | ${tx.reason}`);

    try {
      // Step 1: Analyze
      process.stdout.write("  [1/4] Analyzing with Claude... ");
      const signal = await analyzeTransaction(tx);
      console.log(`✅ ${signal.signal} (${signal.confidence}%)`);
      console.log(`       Reasoning: ${signal.reasoning}`);

      // Step 2: Execute
      process.stdout.write("  [2/4] Executing via Byreal... ");
      const execution = await executeSignal(signal);
      if (execution.skipped) {
        console.log(`⏭  Skipped (${execution.reason})`);
      } else {
        console.log(`✅ ${execution.mode} ${execution.type}`);
      }

      // Step 3: On-chain log
      if (onChainEnabled && signal.signal !== "IGNORE") {
        process.stdout.write("  [3/4] Logging on-chain... ");
        const onChainResult = await logSignalOnChain(signal);
        console.log(onChainResult ? `✅ TX: ${onChainResult.onChainTxHash.slice(0, 14)}...` : "⚠️  Skipped");
      } else {
        console.log("  [3/4] On-chain logging: ⏭  Disabled");
      }

      // Step 4: Telegram
      process.stdout.write("  [4/4] Sending Telegram alert... ");
      await sendSignalAlert(signal, execution?.skipped ? null : execution);
      console.log(process.env.TELEGRAM_BOT_TOKEN ? "✅" : "⏭  No token set");

      passed++;
    } catch (err) {
      console.error(`\n  ❌ Error: ${err.message}`);
      failed++;
    }

    console.log();
    // Pause between tests to avoid API rate limits
    if (i < MOCK_TRANSACTIONS.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("─────────────────────────────────────────────");
  console.log(`✅ Passed: ${passed}/${MOCK_TRANSACTIONS.length}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
  console.log("\n🏁 Simulation complete.");
  process.exit(0);
}

runSimulation().catch(console.error);