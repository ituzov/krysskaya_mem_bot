import { Bot, InputFile } from "grammy";
import {
  getRandomMeme,
  getMemeBuffer,
  incrementSendCount,
  addSubmission,
  supabase,
} from "../lib/supabase";

export const bot = new Bot(process.env.BOT_TOKEN!);

const BOT_USERNAME = process.env.BOT_USERNAME!.toLowerCase();

async function sendRandomMeme(ctx: any) {
  const meme = await getRandomMeme();

  if (!meme) {
    await ctx.reply("У меня пока нет мемов 😢");
    return;
  }

  const username = ctx.from?.username
    ? `@${ctx.from.username}`
    : ctx.from?.first_name ?? "аноним";

  const buffer = await getMemeBuffer(meme.storage_path);
  await ctx.replyWithPhoto(new InputFile(buffer, meme.storage_path), {
    caption: `мем для крысски — ${username}`,
  });

  await incrementSendCount(meme.id);
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

    const ext = file.file_path?.split(".").pop() ?? "jpg";
    const storagePath = `submissions/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("memes")
      .upload(storagePath, buffer, {
        contentType: `image/${ext}`,
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
