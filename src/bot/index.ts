import { Bot, InputFile } from "grammy";
import net from "node:net";
import { SocksClient } from "socks";
import {
  getRandomMeme,
  getMemeBuffer,
  incrementSendCount,
  markMemeSent,
  upsertChat,
  getTodayMeme,
  saveDailyMeme,
  addSubmission,
  supabase,
} from "../lib/supabase";

const TELEGRAM_PROXY = process.env.TELEGRAM_PROXY;

async function startSocks5HttpBridge(socksUrl: string): Promise<string> {
  const u = new URL(socksUrl);
  const upstream = {
    host: u.hostname,
    port: Number(u.port),
    type: 5 as const,
    userId: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };

  return new Promise((resolve) => {
    const server = net.createServer((client) => {
      let buffered = Buffer.alloc(0);

      const onData = async (chunk: Buffer) => {
        buffered = Buffer.concat([buffered, chunk]);
        const headerEnd = buffered.indexOf("\r\n\r\n");
        if (headerEnd === -1) return;

        client.removeListener("data", onData);
        client.pause();

        const head = buffered.slice(0, headerEnd).toString();
        const m = head.match(/^CONNECT ([^:\s]+):(\d+) /);
        if (!m) { client.end("HTTP/1.1 400 Bad Request\r\n\r\n"); return; }
        const [, host, portStr] = m;

        try {
          const { socket: tun } = await SocksClient.createConnection({
            proxy: upstream,
            command: "connect",
            destination: { host, port: Number(portStr) },
          });

          client.write("HTTP/1.1 200 Connection Established\r\n\r\n");

          const leftover = buffered.slice(headerEnd + 4);
          if (leftover.length) tun.write(leftover);

          client.pipe(tun);
          tun.pipe(client);

          const onClientError = (err: Error) => {
            console.error(`[bridge] client error ${host}:${portStr}:`, err.message);
            tun.destroy();
          };
          const onTunError = (err: Error) => {
            console.error(`[bridge] tun error ${host}:${portStr}:`, err.message);
            client.destroy();
          };
          client.on("error", onClientError);
          tun.on("error", onTunError);
          client.on("close", () => tun.destroy());
          tun.on("close", () => client.destroy());
        } catch (e: any) {
          console.error(`[bridge] socks5 connect failed ${host}:${portStr}:`, e?.message);
          client.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
        }
      };

      client.on("data", onData);
      client.on("error", (err) => {
        console.error("[bridge] client pre-tunnel error:", err.message);
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

let botProxy: string | undefined;
if (TELEGRAM_PROXY?.startsWith("socks5://")) {
  botProxy = await startSocks5HttpBridge(TELEGRAM_PROXY);
  console.log(`🧦 SOCKS5 bridge: ${botProxy}`);
} else if (TELEGRAM_PROXY) {
  botProxy = TELEGRAM_PROXY;
}

export const bot = new Bot(process.env.BOT_TOKEN!, botProxy ? {
  client: {
    baseFetchConfig: { proxy: botProxy } as any,
  },
} : undefined);

const BOT_USERNAME = process.env.BOT_USERNAME!.toLowerCase();

const LOADING_PHRASES = [
  "🔍 Изучаю ваших бывших...",
  "🌌 Анализирую расположение звёзд...",
  "🐀 Опрашиваю крыс в подвале...",
  "🧠 Подключаю нейросетку...",
  "🎰 Кручу барабан мемов...",
  "📡 Ловлю сигнал из космоса...",
  "🔮 Консультируюсь с шаром...",
  "🗂 Роюсь в архивах...",
  "☕️ Завариваю чаёк...",
  "🫡 Мем подобран!",
];

function pickLoadingSequence(): string[] {
  const pool = LOADING_PHRASES.slice(0, -1);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return [...shuffled.slice(0, 3), LOADING_PHRASES.at(-1)!];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendRandomMeme(ctx: any) {
  const chatId = ctx.chat.id;
  const userId = ctx.from?.id;

  // Check if user already got a meme today in this chat
  const existing = await getTodayMeme(userId, chatId);

  const meme = existing ?? await getRandomMeme(chatId);

  if (!meme) {
    await ctx.reply("У меня пока нет мемов 😢");
    return;
  }

  const username = ctx.from?.username
    ? `@${ctx.from.username}`
    : ctx.from?.first_name ?? "аноним";

  // Loading animation
  const sequence = pickLoadingSequence();
  const msg = await ctx.reply(sequence[0]);

  for (let i = 1; i < sequence.length; i++) {
    await sleep(1000);
    await ctx.api.editMessageText(ctx.chat.id, msg.message_id, sequence[i]);
  }

  await sleep(500);
  await ctx.api.deleteMessage(ctx.chat.id, msg.message_id).catch(() => {});

  const buffer = await getMemeBuffer(meme.storage_path);
  await ctx.replyWithPhoto(new InputFile(buffer, meme.storage_path), {
    caption: existing
      ? `${username}, ты уже получал мем сегодня 🐀`
      : `мем для крысски — ${username}`,
  });

  if (!existing) {
    const chatTitle = ctx.chat.title ?? ctx.from?.first_name ?? "Личка";
    await Promise.all([
      incrementSendCount(meme.id),
      markMemeSent(chatId, meme.id),
      saveDailyMeme(userId, chatId, meme.id),
      upsertChat(chatId, chatTitle, ctx.chat.type),
    ]);
  }
}

// /kek command — works in groups and DMs
bot.command("kek", async (ctx) => {
  await sendRandomMeme(ctx);
});

// /start — welcome message in DMs
bot.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  await ctx.reply(
    "Привет! Я мем-бот для крысски 🐀\n\n" +
    "/kek — получить рандомный мем\n\n" +
    "Кинь мне картинку — и она может попасть в коллекцию мемов!"
  );
});

// User sends a photo — save as submission
bot.on("message:photo", async (ctx) => {
  // Only accept in private chats
  if (ctx.chat.type !== "private") return;

  try {
    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id; // largest size
    const file = await ctx.api.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());

    const ext = (file.file_path?.split(".").pop() ?? "jpg").toLowerCase();
    const mimeExt = ext === "jpg" ? "jpeg" : ext;
    const storagePath = `submissions/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("memes")
      .upload(storagePath, buffer, {
        contentType: `image/${mimeExt}`,
      });

    if (uploadError) throw uploadError;

    await addSubmission(
      storagePath,
      ctx.from.id,
      ctx.from.username ?? null,
      ctx.from.first_name
    );

    await ctx.reply("Мем отправлен на модерацию! Если одобрят — попадёт в коллекцию 🐀");
  } catch (err) {
    console.error("Submission error:", err);
    await ctx.reply("Не получилось сохранить мем, попробуй ещё раз");
  }
});
