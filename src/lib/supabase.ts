import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: "meme_bot" } }
);

export async function getRandomMeme() {
  // Postgres ORDER BY random() — one row, no full scan
  const { data, error } = await supabase.rpc("get_random_meme");
  if (error || !data) return null;
  return data;
}

export async function incrementSendCount(id: string) {
  await supabase.rpc("increment_send_count", { meme_id: id });
}

export async function getAllMemes() {
  const { data } = await supabase
    .from("memes")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAllMemesWithUrls() {
  const memes = await getAllMemes();
  if (memes.length === 0) return [];

  const { data } = await supabase.storage
    .from("memes")
    .createSignedUrls(
      memes.map((m) => m.storage_path),
      3600
    );

  return memes.map((m, i) => ({
    ...m,
    signedUrl: data?.[i]?.signedUrl ?? "",
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

export async function getMemeBuffer(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("memes")
    .download(storagePath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
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
