import { supabase } from "../src/lib/supabase";

const BUCKET = "memes";

function extToMime(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png":  return "image/png";
    case "gif":  return "image/gif";
    case "webp": return "image/webp";
    default:     return null;
  }
}

async function listAll(prefix = ""): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });
  if (error) throw error;
  if (!data) return out;

  for (const item of data) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      out.push(...await listAll(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const files = await listAll();
console.log(`Found ${files.length} files`);

let fixed = 0, skipped = 0, failed = 0;
for (const path of files) {
  const mime = extToMime(path);
  if (!mime) { skipped++; continue; }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET).download(path);
  if (dlErr || !blob) { console.error(`download ${path}:`, dlErr); failed++; continue; }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .update(path, buffer, { contentType: mime, upsert: true });

  if (upErr) { console.error(`update ${path}:`, upErr); failed++; continue; }
  fixed++;
  if (fixed % 10 === 0) console.log(`...${fixed} fixed`);
}

console.log(`Done. fixed=${fixed} skipped=${skipped} failed=${failed}`);
