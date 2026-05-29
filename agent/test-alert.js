import axios from "axios";
import "dotenv/config";

const token = "8879610226:AAFwsXkcuuP5HQgPKBGZFwNIZSNPlf4Vh7g";
const CHAT_ID = 5152946411;

function esc(str) {
  return String(str ?? "—").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

async function testAlert() {
  const signal = {
    signal: "WATCH",
    confidence: 60,
    smartMoneyScore: 65,
    riskLevel: "MEDIUM",
    reasoning: "Large MNT transfer to contract with low gas price suggests potential accumulation or DeFi interaction by a tracked wallet.",
    action: "Accumulate MNT via Byreal swap",
    valueMNT: "250.0000",
    txHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
    tags: ["large_transfer"]
  };

  const emoji = "👀";
  const riskEmoji = "🟨";
  const tags = signal.tags?.map((t) => `\\#${esc(t)}`).join(" ") || "";
  const explorerUrl = `https://sepolia.mantlescan.xyz/tx/${signal.txHash}`;

  let text =
    `${emoji} *MantleSpy Signal*\n\n` +
    `Signal: *${esc(signal.signal)}* \\| Confidence: *${esc(signal.confidence)}%*\n` +
    `Risk: ${riskEmoji} ${esc(signal.riskLevel)} \\| Score: ${esc(signal.smartMoneyScore)}/100\n\n` +
    `📋 *Analysis*\n${esc(signal.reasoning)}\n\n` +
    `⚡ *Action*: ${esc(signal.action)}\n\n` +
    `💰 Value: ${esc(signal.valueMNT)} MNT\n` +
    `🔗 [View TX](${explorerUrl})\n`;

  if (tags) text += `\n${tags}`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, {
      chat_id: CHAT_ID,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("ERROR STATUS:", err.response.status);
      console.log("ERROR DATA:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.log("ERROR:", err.message);
    }
  }
}

testAlert();
