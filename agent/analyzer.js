import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are MantleSpy, an elite on-chain analyst specializing in the Mantle Network (Ethereum L2).
Your job is to analyze raw blockchain transaction data and determine if it represents "smart money" activity.

Smart money indicators:
- Large value transfers from/to known DeFi protocols
- Wallet accumulation patterns (multiple buys)
- Unusual transaction timing relative to market events
- Contract interactions with high-value transfers
- Wallet-to-wallet moves that precede price action

You MUST respond with ONLY a valid JSON object, no markdown, no explanation outside JSON:
{
  "signal": "BUY" | "SELL" | "WATCH" | "IGNORE",
  "confidence": <integer 0-100>,
  "reasoning": "<2-3 sentences max explaining why>",
  "action": "<specific suggested action, e.g. 'Accumulate MNT on Byreal'>",
  "smartMoneyScore": <integer 0-100>,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "tags": ["<tag1>", "<tag2>"]
}

Tags can include: "whale_move", "accumulation", "distribution", "contract_interaction", "tracked_wallet", "large_transfer", "defi_activity"`;

export async function analyzeTransaction(tx) {
  const prompt = `Analyze this Mantle Network transaction for smart money activity:

Transaction Hash: ${tx.hash}
From: ${tx.from}
To: ${tx.to || "Contract Creation"}
Value: ${tx.valueMNT} MNT
Gas Price: ${tx.gasPrice} gwei
Contract Interaction: ${tx.isContract}
Event Logs Count: ${tx.logsCount}
Flag Reason: ${tx.reason}
Block: ${tx.blockNumber}
Timestamp: ${tx.timestamp}

Is this smart money activity? What does it signal?`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].text.trim();
    const parsed = JSON.parse(raw);

    // Attach metadata
    parsed.txHash = tx.hash;
    parsed.valueMNT = tx.valueMNT;
    parsed.from = tx.from;
    parsed.to = tx.to;
    parsed.blockNumber = tx.blockNumber;
    parsed.analyzedAt = new Date().toISOString();

    // Create verifiable hash of the full signal JSON (for on-chain logging)
    parsed.dataHash = "0x" + createHash("sha256")
      .update(JSON.stringify(parsed))
      .digest("hex");

    return parsed;
  } catch (err) {
    console.error("[Analyzer] Claude API error:", err.message);

    // Fallback signal on error
    return {
      signal: "WATCH",
      confidence: 30,
      reasoning: "Analysis failed — flagged for manual review.",
      action: "Review transaction manually on Mantle Explorer.",
      smartMoneyScore: 30,
      riskLevel: "MEDIUM",
      tags: ["error_fallback"],
      txHash: tx.hash,
      valueMNT: tx.valueMNT,
      from: tx.from,
      to: tx.to,
      blockNumber: tx.blockNumber,
      analyzedAt: new Date().toISOString(),
      dataHash: "0x" + createHash("sha256").update(tx.hash).digest("hex"),
    };
  }
}

export function signalTypeToEnum(signal) {
  const map = { IGNORE: 0, WATCH: 1, BUY: 2, SELL: 3 };
  return map[signal] ?? 0;
}