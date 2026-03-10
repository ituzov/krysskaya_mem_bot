# krysskaya_mem_bot

Telegram мем-бот с веб-админкой. Кидает рандомные мемы в чат, принимает мемы от юзеров на модерацию.

> Проект целиком на [Bun](https://bun.sh) — runtime, пакетный менеджер, запуск TypeScript без компиляции. Node.js не нужен.

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

## Требования

- [Bun](https://bun.sh) >= 1.3 (`curl -fsSL https://bun.sh/install | bash`)
- [Docker](https://docs.docker.com/get-docker/) (для деплоя)
- Telegram-бот — создаётся через [@BotFather](https://t.me/BotFather)
- Supabase-проект — бесплатного тарифа хватит

## Быстрый старт

### 1. Клонируй и установи зависимости

```bash
git clone https://github.com/your-username/krysskaya_mem_bot.git
cd krysskaya_mem_bot
bun install
```

### 2. Создай `.env`

```bash
cp .env.example .env
```

Заполни все переменные (описание ниже).

### 3. Подними Supabase

Выполни SQL из раздела [Supabase](#supabase) в SQL Editor своего проекта.

### 4. Запусти туннель

Бот работает через webhook (без polling), поэтому Telegram должен достучаться до твоего localhost. Нужен туннель.

Например через [tuna.am](https://tuna.am):

```bash
tuna http 3000
```

Полученный URL прописываешь в `WEBHOOK_URL` в `.env`.

### 5. Запусти

```bash
bun run dev
```

Админка будет доступна на `http://localhost:3000`.

## Env

| Переменная | Описание | Пример |
|---|---|---|
| `BOT_TOKEN` | Токен от @BotFather | `123456:ABC-DEF...` |
| `BOT_USERNAME` | Username бота без `@` | `krysskaya_mem_bot` |
| `WEBHOOK_URL` | Внешний URL, куда Telegram шлёт апдейты | `https://your-domain.com` |
| `SUPABASE_URL` | URL Supabase-проекта | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role ключ (не anon!) | `eyJhbGci...` |
| `ADMIN_USER` | Логин для веб-админки | `admin` |
| `ADMIN_PASS` | Пароль для веб-админки | `supersecret` |
| `WEB_PORT` | Порт сервера (опционально) | `3000` |

> **Важно:** используй именно `Service Role` ключ, не `anon`. Anon ключ не имеет прав на кастомные схемы.

## Supabase

Бот использует кастомную схему `meme_bot`. Выполни этот SQL в SQL Editor:

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

Также создай **Storage bucket** с именем `memes` в Supabase Dashboard → Storage. Тип: private.

## Docker

В проекте есть `Dockerfile` на базе `oven/bun:1.3.10-alpine`. Образ лёгкий — только production-зависимости и `src/`.

```bash
docker build -t krysskaya-mem-bot .
docker run --env-file .env -p 3000:3000 krysskaya-mem-bot
```

Для деплоя через [Dokploy](https://dokploy.com) — подключи репо, пропиши env-переменные, порт `3000`.

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

## FAQ

**Бот не отвечает на команды**
Проверь что `WEBHOOK_URL` доступен извне. Открой `{WEBHOOK_URL}/webhook` в браузере — должен быть ответ (даже если ошибка). Если таймаут — туннель не работает или порт неправильный.

**`permission denied for table`**
Ты используешь `anon` ключ вместо `Service Role`, или не выполнил `GRANT` из SQL выше.

**`bun: command not found`**
Bun не установлен. Ставь: `curl -fsSL https://bun.sh/install | bash`, перезапусти терминал.

**Админка просит логин/пароль**
Это Basic Auth. Логин и пароль — из `ADMIN_USER` и `ADMIN_PASS` в `.env`.

**Юзер кидает фото, но бот молчит**
Бот принимает фото только в личных сообщениях. В группах фото игнорируются.

**`frozen lockfile` ошибка при docker build**
Файл `bun.lock` не закоммичен. Запусти `bun install` локально, закоммить `bun.lock`.

**Мемы не грузятся в админке / битые картинки**
Signed URL истекают через час. Перезагрузи страницу. Также проверь что Storage bucket `memes` создан в Supabase.

**Как сменить порт**
Поменяй `WEB_PORT` в `.env`. В Docker не забудь поменять маппинг: `-p НОВЫЙ_ПОРТ:НОВЫЙ_ПОРТ`.
