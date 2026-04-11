import { bot } from "./bot";
import { app } from "./web";

const PORT = Number(process.env.WEB_PORT) || 3000;

await bot.api.deleteWebhook({ drop_pending_updates: true });

bot.start({
  onStart: (me) => console.log(`🤖 Bot @${me.username} started (long polling)`),
}).catch((err) => console.error("Bot polling error:", err));

console.log(`🌐 Web panel: http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
