import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { webhookCallback } from "grammy";
import { bot } from "../bot";
import {
  getAllMemesWithUrls,
  addMeme,
  deleteMeme,
  getAllSubmissions,
  approveSubmission,
  rejectSubmission,
} from "../lib/supabase";
import { layout, memeRows, submissionRows } from "./templates";

export const app = new Hono();

// Telegram webhook — no auth
app.post("/webhook", webhookCallback(bot, "hono"));

// Basic auth on everything else
app.use(
  "/*",
  basicAuth({
    username: process.env.ADMIN_USER!,
    password: process.env.ADMIN_PASS!,
  })
);

// Web panel — main page
app.get("/", async (c) => {
  const [memes, submissions] = await Promise.all([
    getAllMemesWithUrls(),
    getAllSubmissions(),
  ]);
  return c.html(
    layout(memeRows(memes), memes.length, submissionRows(submissions), submissions.length)
  );
});

// Upload single meme
app.post("/memes", async (c) => {
  const body = await c.req.parseBody();
  const name = body["name"] as string;
  const file = body["file"] as File;

  if (!name || !file) return c.text("Нужно название и файл", 400);

  await addMeme(name, file);

  const memes = await getAllMemesWithUrls();
  return c.html(memeRows(memes));
});

// Bulk upload memes
app.post("/memes/bulk", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const files = body["files"];

  if (!files) return c.text("Нужны файлы", 400);

  const fileList = Array.isArray(files) ? files : [files];

  for (const file of fileList) {
    if (!(file instanceof File)) continue;
    try {
      const name = file.name.replace(/\.[^.]+$/, "");
      await addMeme(name, file);
    } catch {}
  }

  const memes = await getAllMemesWithUrls();
  return c.html(memeRows(memes));
});

// Delete meme
app.delete("/memes/:id", async (c) => {
  await deleteMeme(c.req.param("id"));
  return c.html("");
});

// Approve submission
app.post("/submissions/:id/approve", async (c) => {
  const userId = await approveSubmission(c.req.param("id"));
  if (userId) {
    bot.api.sendMessage(userId, "Твой мем одобрен и попал в коллекцию! 🐀🎉").catch(() => {});
  }
  return c.html("");
});

// Reject submission
app.post("/submissions/:id/reject", async (c) => {
  const userId = await rejectSubmission(c.req.param("id"));
  if (userId) {
    bot.api.sendMessage(userId, "Мем не прошёл модерацию, попробуй другой 🐀").catch(() => {});
  }
  return c.html("");
});
