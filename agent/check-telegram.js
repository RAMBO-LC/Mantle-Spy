import axios from "axios";
import "dotenv/config";

const token = "8879610226:AAFwsXkcuuP5HQgPKBGZFwNIZSNPlf4Vh7g";

async function checkTelegram() {
  try {
    console.log("Checking webhook info...");
    const infoRes = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    console.log("Webhook Info:", infoRes.data);

    if (infoRes.data.result.url) {
      console.log("Webhook is active, deleting webhook...");
      const delRes = await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);
      console.log("Delete Webhook Result:", delRes.data);
    } else {
      console.log("No active webhook.");
    }

    console.log("Checking bot status...");
    const meRes = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    console.log("Bot Info:", meRes.data);

    console.log("Attempting test message to chat 5152946411...");
    const msgRes = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: 5152946411,
      text: "🔔 *MantleSpy Diagnostic Message*\nThis is a test from the diagnostic script.",
      parse_mode: "Markdown"
    });
    console.log("Send Message Result:", msgRes.data);

  } catch (err) {
    console.error("Error occurred:", err.response ? err.response.data : err.message);
  }
}

checkTelegram();
