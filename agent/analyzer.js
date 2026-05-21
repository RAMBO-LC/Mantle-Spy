import Groq from "groq-sdk";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

// ── Groq client ───────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Optional Byreal skill context ─────────────────────────────────────────────
const skillPath = path.resolve("./agent/skills/byreal-skill.md");
const byrealSkill = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, "utf-8") : "";

// ── System prompt ─────────────────────────────────────────────────────────────
// Key change: explicitly tell the model NOT to think/reason, just output JSON.
// This suppresses <think> blocks on qwen3 models.
const SYSTEM_PROMPT = `You are MantleSpy, an elite Mantle Network on-chain analyst.

${byrealSkill ? `Byreal context:\n${byrealSkill}\n` : ""}

CRITICAL RULES — violating any rule makes your output useless:
1. Output ONLY a single raw JSON object. Nothing else.
2. NO <think> blocks. NO markdown. NO backticks. NO explanation.
3. Start your response with { and end with }
4. confidence and smartMoneyScore MUST be integers between 0 and 100 (e.g. 75, not 0.75)

Smart money indicators: large DeFi contract interactions, whale wallet flows,
accumulation patterns, unusual gas usage, high log count interactions.

JSON schema (output exactly this shape):
{
  "signal": "BUY" | "SELL" | "WATCH" | "IGNORE",
  "confidence": <integer 0-100>,
  "reasoning": "<2 sentences max>",
  "action": "<specific action e.g. Accumulate MNT via Byreal swap>",
  "smartMoneyScore": <integer 0-100>,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "tags": ["whale_move"|"accumulation"|"distribution"|"contract_interaction"|"tracked_wallet"|"large_transfer"|"defi_activity"]
}`;

// ── JSON extraction — handles partial think blocks and markdown fences ─────────
function extractJSON(raw) {
  // Strip <think>...</think> blocks (including unclosed ones)
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "") // unclosed think tag
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Find first { and last } to extract JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found. Raw output was:\n${raw.slice(0, 300)}`);
  }

  return cleaned.slice(start, end + 1);
}

// ── Normalize numeric fields — handles decimals like 0.75 → 75 ───────────────
function normalizeSignal(parsed) {
  // Fix decimals (model outputting 0.75 instead of 75)
  for (const field of ["confidence", "smartMoneyScore"]) {
    let val = Number(parsed[field]) || 0;
    if (val > 0 && val <= 1) val = Math.round(val * 100);
    parsed[field] = Math.max(0, Math.min(100, Math.round(val)));
  }

  // Ensure valid signal type
  const valid = ["BUY", "SELL", "WATCH", "IGNORE"];
  if (!valid.includes(parsed.signal)) parsed.signal = "WATCH";

  // Ensure valid riskLevel
  const validRisk = ["LOW", "MEDIUM", "HIGH"];
  if (!validRisk.includes(parsed.riskLevel)) parsed.riskLevel = "MEDIUM";

  // Ensure tags is array
  if (!Array.isArray(parsed.tags)) parsed.tags = [];

  return parsed;
}

// ── Main analyzer ─────────────────────────────────────────────────────────────
export async function analyzeTransaction(tx) {
  const prompt = `Analyze this Mantle Network transaction for smart money activity and return JSON only:

Hash: ${tx.hash}
From: ${tx.from}
To: ${tx.to || "Contract Creation"}
Value: ${tx.valueMNT} MNT
Gas Price: ${tx.gasPrice} gwei
Contract Interaction: ${tx.isContract}
Event Logs: ${tx.logsCount}
Flag Reason: ${tx.reason}
Block: ${tx.blockNumber}`;

  try {
    console.log(`[Analyzer] Processing ${tx.hash.slice(0, 10)}...`);

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3-32b",
      temperature: 0.1,
      max_tokens: 1024,          // raised from 300 — thinking needs headroom
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "";

    // Uncomment for debugging:
    // console.log("[Analyzer] Raw output:", raw.slice(0, 500));

    const jsonStr = extractJSON(raw);
    let parsed = JSON.parse(jsonStr);
    parsed = normalizeSignal(parsed);

    // Attach metadata
    parsed.txHash = tx.hash;
    parsed.valueMNT = tx.valueMNT;
    parsed.from = tx.from;
    parsed.to = tx.to;
    parsed.blockNumber = tx.blockNumber;
    parsed.analyzedAt = new Date().toISOString();
    parsed.dataHash = "0x" + createHash("sha256")
      .update(JSON.stringify(parsed))
      .digest("hex");

    console.log(`[Analyzer] ✅ ${parsed.signal} (${parsed.confidence}%) — ${parsed.reasoning?.slice(0, 60)}...`);
    return parsed;

  } catch (err) {
    console.error(`[Analyzer] ❌ Failed: ${err.message}`);

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
  return { IGNORE: 0, WATCH: 1, BUY: 2, SELL: 3 }[signal] ?? 0;
}