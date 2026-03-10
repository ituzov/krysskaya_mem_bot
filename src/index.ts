import { bot } from "./bot";
import { app } from "./web";

const PORT = Number(process.env.WEB_PORT) || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL!;

await bot.api.setWebhook(`${WEBHOOK_URL}/webhook`);
console.log(`🤖 Bot webhook: ${WEBHOOK_URL}/webhook`);
console.log(`🌐 Web panel: http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
