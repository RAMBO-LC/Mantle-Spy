import ollama from 'ollama';
import { createHash } from "crypto";
import fs from 'fs';
import path from 'path';

const skillPath = path.resolve('.agents/skills/byreal-cli/SKILL.md');

const byrealSkill = fs.readFileSync(skillPath, 'utf-8');

const SYSTEM_PROMPT = `
You are MantleSpy, an elite on-chain AI agent specializing in:
- Mantle Network
- Smart money analysis
- Byreal CLI operations
- Solana DeFi execution

You MUST obey the following operational skill rules:

${byrealSkill}

You MUST respond ONLY with valid JSON.

NEVER use markdown.
NEVER wrap JSON in triple backticks.
Return ONLY raw valid JSON.`;
export async function analyzeTransaction(tx) {
  const prompt = `
Analyze this Mantle Network transaction.

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
`;

  try {
    const response = await ollama.chat({
      model: 'deepseek-r1:8b',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      options: {
          temperature: 0.2
        },      
    });

    const raw = response.message.content.trim();

    // Remove markdown wrappers if model adds them
    const cleaned = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    parsed.txHash = tx.hash;
    parsed.valueMNT = tx.valueMNT;
    parsed.from = tx.from;
    parsed.to = tx.to;
    parsed.blockNumber = tx.blockNumber;
    parsed.analyzedAt = new Date().toISOString();

    parsed.dataHash =
      "0x" +
      createHash("sha256")
        .update(JSON.stringify(parsed))
        .digest("hex");

    return parsed;

  } catch (err) {
    console.error("[Analyzer] Ollama error:", err.message);

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
      dataHash:
        "0x" +
        createHash("sha256")
          .update(tx.hash)
          .digest("hex"),
    };
  }
}

export function signalTypeToEnum(signal) {
  const map = {
    IGNORE: 0,
    WATCH: 1,
    BUY: 2,
    SELL: 3
  };

  return map[signal] ?? 0;
}