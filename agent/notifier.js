import axios from "axios";
import { safeRequest } from "./utils/request.js";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SIGNAL_EMOJI = { BUY: "🟢", SELL: "🔴", WATCH: "👀", IGNORE: "⚪" };
const RISK_EMOJI = { LOW: "🟩", MEDIUM: "🟨", HIGH: "🟥" };

let token = null;
let lastUpdateId = 0;
let isPolling = false;

// Callbacks
let handleAddWallet = null;
let handleGetStatus = null;

export function initBot(onAddWallet, onStatus, { polling = true } = {}) {
  token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Notifier] No TELEGRAM_BOT_TOKEN set — Telegram alerts disabled");
    return null;
  }

  handleAddWallet = onAddWallet;
  handleGetStatus = onStatus;

  console.log("[Notifier] Telegram bot initialized via Axios");

  // Start polling only if requested (skip in simulation to avoid 409 conflicts)
  if (polling) {
    isPolling = true;
    pollUpdates();
  }

  return true; // Indicate active
}

async function pollUpdates() {
  if (!isPolling || !token) return;

  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const data = await safeRequest(
    async () => {
      const res = await axios.post(
        url,
        { offset: lastUpdateId + 1, timeout: 10 },
        { timeout: 15000 }
      );
      return res.data;
    },
    "Telegram",
    2 // use max 2 retries for polling to avoid long hangs
  );

  if (data && data.ok) {
    for (const update of data.result) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);
      await handleMessage(update.message);
    }
  }

  // Loop
  setTimeout(pollUpdates, 2000);
}

async function handleMessage(msg) {
  if (!msg || !msg.text) return;
  const text = msg.text.trim();
  const chatId = msg.chat.id;

  if (text.startsWith("/start")) {
    await sendMessage(
      chatId,
      `👁 *MantleSpy Agent*\n\nI'm watching Mantle Network for smart money movements.\n\n*Commands:*\n/status — Agent status\n/track 0x... — Track a wallet\n/signals — Last 5 signals`,
      "Markdown"
    );
  } else if (text.startsWith("/status")) {
    const stats = handleGetStatus ? await handleGetStatus() : {};
    await sendMessage(
      chatId,
      `📊 *Agent Status*\n\n` +
        `• Running: ${stats.isRunning ? "✅" : "❌"}\n` +
        `• Blocks scanned: ${stats.blocksScanned || 0}\n` +
        `• Last block: #${stats.lastBlockNumber || "—"}\n` +
        `• Latency: ${stats.latencyMs || 0}ms\n` +
        `• Tracked wallets: ${stats.trackedWallets || 0}\n` +
        `• Mode: ${process.env.EXECUTION_MODE || "mock"}`,
      "Markdown"
    );
  } else if (text.startsWith("/track")) {
    const address = text.split(" ")[1]?.trim();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      await sendMessage(chatId, "❌ Invalid Ethereum address format.");
      return;
    }
    if (handleAddWallet) handleAddWallet(address);
    await sendMessage(chatId, `✅ Now tracking wallet:\n\`${address}\``, "Markdown");
  }
}

async function sendMessage(chatId, text, parseMode = "MarkdownV2") {
  if (!token) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await safeRequest(
    async () => {
      await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }, { timeout: 10000 });
    },
    "Telegram"
  );
}

// Escape special chars for Telegram MarkdownV2
function esc(str) {
  return String(str ?? "—").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

export async function sendSignalAlert(signal, execution = null) {
  if (!token || !CHAT_ID) return;

  const emoji = SIGNAL_EMOJI[signal.signal] || "⚪";
  const riskEmoji = RISK_EMOJI[signal.riskLevel] || "🟨";
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

  if (execution?.executed) {
    text +=
      `\n\n🤖 *Auto\\-Executed on Byreal*\n` +
      `• Type: ${esc(execution.type)}\n` +
      `• Pair: ${esc(execution.pair || "—")}\n` +
      `• Mode: ${esc(execution.mode)}\n`;
    if (execution.pnlPercent) text += `• Mock PnL: ${esc(execution.pnlPercent)}%\n`;
  }

  // Notice we use MarkdownV2 here because we escaped properly
  await sendMessage(CHAT_ID, text, "MarkdownV2");
}

export async function sendStartupMessage() {
  if (!token || !CHAT_ID) return;
  const mode = esc(process.env.EXECUTION_MODE || "mock");
  await sendMessage(
    CHAT_ID,
    `🚀 *MantleSpy Agent Started*\n\nNow monitoring Mantle Network for smart money movements\\.\nMode: \`${mode}\``,
    "MarkdownV2"
  );
}