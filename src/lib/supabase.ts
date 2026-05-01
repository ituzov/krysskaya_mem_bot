import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: "meme_bot" } }
);

export async function getRandomMeme(chatId?: number) {
  if (!chatId) {
    const { data, error } = await supabase.rpc("get_random_meme");
    if (error || !data) return null;
    return data;
  }

  // Get unseen meme for this chat
  const { data, error } = await supabase.rpc("get_random_unseen_meme", {
    p_chat_id: chatId,
  });

  // SQL function with composite return type yields a row of NULLs when no
  // rows match — check id, not the wrapper object.
  if (!error && data?.id) return data;

  // All memes seen — reset and start over
  await supabase.from("chat_meme_history").delete().eq("chat_id", chatId);
  const { data: fresh, error: freshErr } = await supabase.rpc("get_random_meme");
  if (freshErr || !fresh?.id) return null;
  return fresh;
}

export async function markMemeSent(chatId: number, memeId: string) {
  await supabase
    .from("chat_meme_history")
    .upsert({ chat_id: chatId, meme_id: memeId });
}

export async function getTodayMeme(userId: number, chatId: number) {
  const today = new Date().toISOString().split("T")[0]; // UTC date

  const { data } = await supabase
    .from("daily_memes")
    .select("meme_id")
    .eq("user_id", userId)
    .eq("chat_id", chatId)
    .eq("date", today)
    .single();

  if (!data) return null;

  const { data: meme } = await supabase
    .from("memes")
    .select("*")
    .eq("id", data.meme_id)
    .single();

  return meme;
}

export async function saveDailyMeme(userId: number, chatId: number, memeId: string) {
  const today = new Date().toISOString().split("T")[0];
  await supabase.from("daily_memes").upsert({
    user_id: userId,
    chat_id: chatId,
    meme_id: memeId,
    date: today,
  });
}

export async function upsertChat(chatId: number, title: string, type: string) {
  await supabase.from("chats").upsert({
    chat_id: chatId,
    title,
    type,
    updated_at: new Date().toISOString(),
  });
}

export async function getChatStats() {
  const { data: chats } = await supabase
    .from("chats")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!chats || chats.length === 0) return [];

  const { data: counts } = await supabase
    .from("chat_meme_history")
    .select("chat_id")
    .in("chat_id", chats.map((c) => c.chat_id));

  const countMap: Record<number, number> = {};
  for (const row of counts ?? []) {
    countMap[row.chat_id] = (countMap[row.chat_id] ?? 0) + 1;
  }

  return chats.map((c) => ({
    ...c,
    memes_sent: countMap[c.chat_id] ?? 0,
  }));
}

export async function incrementSendCount(id: string) {
  await supabase.rpc("increment_send_count", { meme_id: id });
}

export const MEMES_PER_PAGE = 30;

export async function getMemesCount() {
  const { count } = await supabase
    .from("memes")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function getMemesPage(offset = 0, limit = MEMES_PER_PAGE) {
  const { data } = await supabase
    .from("memes")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const memes = data ?? [];
  if (memes.length === 0) return [];

  const { data: urls } = await supabase.storage
    .from("memes")
    .createSignedUrls(
      memes.map((m) => m.storage_path),
      3600
    );

  return memes.map((m, i) => ({
    ...m,
    signedUrl: urls?.[i]?.signedUrl ?? "",
  }));
}

export async function addMeme(name: string, file: File) {
  const ext = file.name.split(".").pop();
  const storagePath = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("memes")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase
    .from("memes")
    .insert({ name, storage_path: storagePath });

  if (dbError) {
    // Rollback: remove uploaded file
    await supabase.storage.from("memes").remove([storagePath]);
    throw dbError;
  }
}

export async function deleteMeme(id: string) {
  const { data: meme } = await supabase
    .from("memes")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!meme) return;

  await supabase.storage.from("memes").remove([meme.storage_path]);
  await supabase.from("memes").delete().eq("id", id);
}

export async function getMemeSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("memes")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

// --- Submissions ---

export async function addSubmission(
  storagePath: string,
  userId: number,
  username: string | null,
  firstName: string
) {
  const { error } = await supabase.from("submissions").insert({
    storage_path: storagePath,
    user_id: userId,
    username,
    first_name: firstName,
  });
  if (error) throw error;
}

export async function getAllSubmissions() {
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const submissions = data ?? [];
  if (submissions.length === 0) return [];

  const { data: urls } = await supabase.storage
    .from("memes")
    .createSignedUrls(
      submissions.map((s) => s.storage_path),
      3600
    );

  return submissions.map((s, i) => ({
    ...s,
    signedUrl: urls?.[i]?.signedUrl ?? "",
  }));
}

export async function approveSubmission(id: string): Promise<number | null> {
  const { data: sub } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (!sub) return null;

  const name = sub.username
    ? `от @${sub.username}`
    : `от ${sub.first_name}`;

  await supabase.from("memes").insert({
    name,
    storage_path: sub.storage_path,
  });

  await supabase
    .from("submissions")
    .update({ status: "approved" })
    .eq("id", id);

  return sub.user_id;
}

export async function rejectSubmission(id: string): Promise<number | null> {
  const { data: sub } = await supabase
    .from("submissions")
    .select("storage_path, user_id")
    .eq("id", id)
    .single();

  if (!sub) return null;

  await supabase.storage.from("memes").remove([sub.storage_path]);
  await supabase
    .from("submissions")
    .update({ status: "rejected" })
    .eq("id", id);

  return sub.user_id;
}
