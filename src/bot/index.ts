import { Bot } from "grammy";
import {
  getRandomMeme,
  getMemeSignedUrl,
  incrementSendCount,
  markMemeSent,
  upsertChat,
  getTodayMeme,
  saveDailyMeme,
  addSubmission,
  supabase,
} from "../lib/supabase";

const TELEGRAM_PROXY = process.env.TELEGRAM_PROXY;

export const bot = new Bot(process.env.BOT_TOKEN!, TELEGRAM_PROXY ? {
  client: {
    baseFetchConfig: { proxy: TELEGRAM_PROXY } as any,
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

  const photoUrl = await getMemeSignedUrl(meme.storage_path);
  await ctx.replyWithPhoto(photoUrl, {
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

    const response = await fetch(url, TELEGRAM_PROXY ? ({ proxy: TELEGRAM_PROXY } as any) : undefined);
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
