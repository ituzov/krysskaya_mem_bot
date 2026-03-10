# krysskaya_mem_bot

Telegram мем-бот с веб-админкой. Кидает рандомные мемы в чат, принимает мемы от юзеров на модерацию.

## Что умеет

- `/kek` — рандомный мем из коллекции
- `/start` — приветствие с инструкцией
- Юзер кидает фото в лс боту — уходит на модерацию
- Бот уведомляет юзера: одобрен мем или нет
- Веб-админка: загрузка, массовая загрузка, удаление, модерация сабмитов
- Счётчик отправок каждого мема

## Стек

- **Runtime** — [Bun](https://bun.sh)
- **Web** — [Hono](https://hono.dev)
- **Bot** — [grammY](https://grammy.dev)
- **Storage & DB** — [Supabase](https://supabase.com)
- **Frontend** — HTMX
- **Deploy** — Docker + [Dokploy](https://dokploy.com)

## Запуск

```bash
bun install
bun run dev
```

## Env

```env
BOT_TOKEN=
BOT_USERNAME=
WEBHOOK_URL=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ADMIN_USER=
ADMIN_PASS=
WEB_PORT=3000
```

## Supabase

Бот использует кастомную схему `meme_bot`. SQL для инициализации:

```sql
CREATE SCHEMA IF NOT EXISTS meme_bot;

CREATE TABLE meme_bot.memes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  storage_path text NOT NULL,
  send_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meme_bot.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  user_id bigint NOT NULL,
  username text,
  first_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_status ON meme_bot.submissions(status);

-- Рандомный мем без full scan
CREATE OR REPLACE FUNCTION meme_bot.get_random_meme()
RETURNS meme_bot.memes AS $$
  SELECT * FROM meme_bot.memes ORDER BY random() LIMIT 1;
$$ LANGUAGE sql;

-- Инкремент счётчика
CREATE OR REPLACE FUNCTION meme_bot.increment_send_count(meme_id uuid)
RETURNS void AS $$
  UPDATE meme_bot.memes SET send_count = send_count + 1 WHERE id = meme_id;
$$ LANGUAGE sql;

-- Права
GRANT ALL ON meme_bot.memes TO service_role;
GRANT ALL ON meme_bot.submissions TO service_role;
```

Также создай Storage bucket `memes` в Supabase.

## Docker

```bash
docker build -t krysskaya-mem-bot .
docker run --env-file .env -p 3000:3000 krysskaya-mem-bot
```

## Структура

```
src/
├── index.ts          # Точка входа, webhook + сервер
├── bot/
│   └── index.ts      # Команды бота, приём фото
├── web/
│   ├── index.ts      # Роуты админки + webhook endpoint
│   └── templates.ts  # HTML шаблоны (HTMX)
└── lib/
    └── supabase.ts   # Клиент Supabase, CRUD
```
