import TelegramBot from "node-telegram-bot-api";

let bot = null;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SIGNAL_EMOJI = { BUY: "🟢", SELL: "🔴", WATCH: "👀", IGNORE: "⚪" };
const RISK_EMOJI = { LOW: "🟩", MEDIUM: "🟨", HIGH: "🟥" };

export function initBot(onAddWallet, onStatus) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  if (!token) {
    console.warn("[Notifier] No TELEGRAM_BOT_TOKEN or TELEGRAM_TOKEN set — Telegram alerts disabled");
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("[Notifier] Telegram bot initialized");

  // /start
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `👁 *MantleSpy Agent*\n\nI'm watching Mantle Network for smart money movements.\n\n*Commands:*\n/status — Agent status\n/track 0x... — Track a wallet\n/signals — Last 5 signals`,
      { parse_mode: "Markdown" }
    );
  });

  // /status
  bot.onText(/\/status/, async (msg) => {
    const stats = onStatus ? await onStatus() : {};
    bot.sendMessage(
      msg.chat.id,
      `📊 *Agent Status*\n\n` +
        `• Running: ${stats.isRunning ? "✅" : "❌"}\n` +
        `• Blocks scanned: ${stats.blocksScanned || 0}\n` +
        `• Last block: #${stats.lastBlockNumber || "—"}\n` +
        `• Latency: ${stats.latencyMs || 0}ms\n` +
        `• Tracked wallets: ${stats.trackedWallets || 0}\n` +
        `• Mode: ${process.env.EXECUTION_MODE || "mock"}`,
      { parse_mode: "Markdown" }
    );
  });

  // /track 0x...
  bot.onText(/\/track (.+)/, (msg, match) => {
    const address = match[1].trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      bot.sendMessage(msg.chat.id, "❌ Invalid Ethereum address format.");
      return;
    }
    if (onAddWallet) onAddWallet(address);
    bot.sendMessage(
      msg.chat.id,
      `✅ Now tracking wallet:\n\`${address}\``,
      { parse_mode: "Markdown" }
    );
  });

  bot.on("polling_error", (err) => {
    console.error("[Notifier] Telegram polling error:", err.message);
  });

  return bot;
}

export async function sendSignalAlert(signal, execution = null) {
  if (!bot || !CHAT_ID) return;

  const emoji = SIGNAL_EMOJI[signal.signal] || "⚪";
  const riskEmoji = RISK_EMOJI[signal.riskLevel] || "🟨";

  const tags = signal.tags?.map((t) => `#${t}`).join(" ") || "";

  let text =
    `${emoji} *MantleSpy Signal Detected*\n\n` +
    `Signal: *${signal.signal}* | Confidence: *${signal.confidence}%*\n` +
    `Risk: ${riskEmoji} ${signal.riskLevel} | Smart Money Score: ${signal.smartMoneyScore}/100\n\n` +
    `📋 *Analysis*\n${signal.reasoning}\n\n` +
    `⚡ *Action*: ${signal.action}\n\n` +
    `💰 Value: ${signal.valueMNT} MNT\n` +
    `🔗 [View TX on Mantle Explorer](https://mantlescan.xyz/tx/${signal.txHash})\n`;

  if (tags) text += `\n${tags}`;

  if (execution?.executed) {
    text +=
      `\n\n🤖 *Auto-Executed on Byreal*\n` +
      `• Type: ${execution.type}\n` +
      `• Pair: ${execution.pair || "—"}\n` +
      `• Mode: ${execution.mode}\n`;
    if (execution.pnlPercent) text += `• Mock PnL: ${execution.pnlPercent}%\n`;
  }

  try {
    await bot.sendMessage(CHAT_ID, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("[Notifier] Failed to send message:", err.message);
  }
}

export async function sendStartupMessage() {
  if (!bot || !CHAT_ID) return;
  await bot.sendMessage(
    CHAT_ID,
    `🚀 *MantleSpy Agent Started*\n\nNow monitoring Mantle Network for smart money movements.\nMode: \`${process.env.EXECUTION_MODE || "mock"}\``,
    { parse_mode: "Markdown" }
  );
}