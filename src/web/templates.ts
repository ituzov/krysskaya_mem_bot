export function layout(
  body: string,
  memeCount: number,
  submissionsBody: string,
  submissionCount: number,
  chatStats: string
) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Мем-менеджер</title>
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-primary: #020617;
      --bg-secondary: #0F172A;
      --bg-card: #1E293B;
      --bg-input: #0F172A;
      --border: #334155;
      --border-hover: #475569;
      --text-primary: #F8FAFC;
      --text-secondary: #94A3B8;
      --text-muted: #64748B;
      --accent: #22C55E;
      --accent-hover: #16A34A;
      --danger: #EF4444;
      --danger-hover: #DC2626;
      --warning: #F59E0B;
      --radius: 12px;
      --radius-sm: 8px;
      --transition: 200ms ease;
    }

    body {
      font-family: 'Fira Sans', system-ui, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }

    /* Header */
    .header {
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
      padding: 1.25rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .header h1 {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.025em;
    }

    .header-badges {
      display: flex;
      gap: 0.5rem;
    }

    .header .badge {
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 100px;
    }

    .badge-green {
      color: var(--accent);
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .badge-yellow {
      color: var(--warning);
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    /* Main */
    .main {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Upload card */
    .upload-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .upload-card h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }

    .upload-form {
      display: flex;
      gap: 0.75rem;
      align-items: end;
      flex-wrap: wrap;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      flex: 1;
      min-width: 200px;
    }

    .field label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .field input[type="text"] {
      font-family: 'Fira Sans', system-ui, sans-serif;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: 0.9rem;
      outline: none;
      transition: border-color var(--transition);
    }

    .field input[type="text"]:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
    }

    .field input[type="text"]::placeholder {
      color: var(--text-muted);
    }

    .file-input-wrap {
      position: relative;
      min-width: 200px;
      flex: 1;
    }

    .file-input-wrap label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
      display: block;
      margin-bottom: 0.375rem;
    }

    .file-input-wrap input[type="file"] {
      font-family: 'Fira Sans', system-ui, sans-serif;
      width: 100%;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--border);
      background: var(--bg-input);
      color: var(--text-secondary);
      font-size: 0.85rem;
      cursor: pointer;
      transition: border-color var(--transition);
    }

    .file-input-wrap input[type="file"]:hover {
      border-color: var(--border-hover);
    }

    .btn {
      font-family: 'Fira Sans', system-ui, sans-serif;
      padding: 0.625rem 1.25rem;
      border-radius: var(--radius-sm);
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
      white-space: nowrap;
    }

    .btn-accent {
      background: var(--accent);
      color: #020617;
    }

    .btn-accent:hover {
      background: var(--accent-hover);
    }

    .btn-danger {
      background: transparent;
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--danger);
    }

    .btn-approve {
      background: transparent;
      color: var(--accent);
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
    }

    .btn-approve:hover {
      background: rgba(34, 197, 94, 0.1);
      border-color: var(--accent);
    }

    /* Section header */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .section-header h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .section-header .count {
      font-family: 'Fira Code', monospace;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* Meme grid */
    .meme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .meme-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: border-color var(--transition);
    }

    .meme-card:hover {
      border-color: var(--border-hover);
    }

    .meme-card .meme-img-wrap {
      aspect-ratio: 1;
      overflow: hidden;
      background: var(--bg-card);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .meme-card .meme-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .meme-card .meme-info {
      padding: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .meme-card .meme-meta {
      overflow: hidden;
      min-width: 0;
    }

    .meme-card .meme-name {
      font-size: 0.85rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    .meme-card .meme-stats {
      font-family: 'Fira Code', monospace;
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.125rem;
    }

    .meme-card .meme-actions {
      display: flex;
      gap: 0.375rem;
      flex-shrink: 0;
    }

    /* Submission card */
    .sub-card {
      background: var(--bg-secondary);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--radius);
      overflow: hidden;
      transition: border-color var(--transition);
    }

    .sub-card:hover {
      border-color: var(--warning);
    }

    .sub-card .meme-img-wrap {
      aspect-ratio: 1;
      overflow: hidden;
      background: var(--bg-card);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sub-card .meme-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .sub-card .sub-info {
      padding: 0.75rem;
    }

    .sub-card .sub-user {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sub-card .sub-actions {
      display: flex;
      gap: 0.375rem;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-muted);
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      opacity: 0.4;
    }

    .empty-state p {
      font-size: 0.9rem;
    }

    /* Tabs */
    .upload-tabs {
      display: flex;
      gap: 0;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .upload-tab {
      font-family: 'Fira Sans', system-ui, sans-serif;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all var(--transition);
    }

    .upload-tab:hover {
      color: var(--text-secondary);
    }

    .upload-tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed var(--border);
      border-radius: var(--radius);
      padding: 2.5rem;
      text-align: center;
      cursor: pointer;
      transition: all var(--transition);
    }

    .drop-zone:hover, .drop-zone.dragover {
      border-color: var(--accent);
      background: rgba(34, 197, 94, 0.05);
    }

    .drop-zone svg {
      width: 36px;
      height: 36px;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }

    .drop-zone p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .drop-zone .accent {
      color: var(--accent);
      font-weight: 500;
    }

    .file-count {
      font-family: 'Fira Code', monospace;
      font-size: 0.8rem;
      color: var(--accent);
      margin-top: 0.75rem;
    }

    /* Indicator */
    .htmx-indicator {
      opacity: 0;
      transition: opacity 200ms;
    }
    .htmx-request .htmx-indicator {
      opacity: 1;
    }

    /* Lightbox */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.85);
      align-items: center;
      justify-content: center;
      cursor: pointer;
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
    }

    .lightbox.open {
      display: flex;
    }

    .lightbox img {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: var(--radius);
      object-fit: contain;
      cursor: default;
    }

    .meme-img-wrap {
      cursor: pointer;
    }

    /* Chat stats */
    .chat-stats {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .chat-stats h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }

    .chat-table {
      width: 100%;
      border-collapse: collapse;
    }

    .chat-table th {
      text-align: left;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .chat-table td {
      padding: 0.625rem 0.75rem;
      font-size: 0.85rem;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    }

    .chat-table tr:last-child td {
      border-bottom: none;
    }

    .chat-table .chat-type {
      font-family: 'Fira Code', monospace;
      font-size: 0.7rem;
      color: var(--text-muted);
      background: var(--bg-card);
      padding: 0.125rem 0.5rem;
      border-radius: 100px;
    }

    .chat-table .chat-count {
      font-family: 'Fira Code', monospace;
      color: var(--accent);
    }

    /* Responsive */
    @media (max-width: 640px) {
      .main { padding: 1rem; }
      .upload-form { flex-direction: column; }
      .field, .file-input-wrap { min-width: 100%; }
      .meme-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>Мем-менеджер</h1>
    <div class="header-badges">
      ${submissionCount > 0 ? `<span class="badge badge-yellow" id="sub-count">${submissionCount} на модерации</span>` : ''}
      <span class="badge badge-green" id="count">${memeCount} шт.</span>
    </div>
  </header>

  <main class="main">
    ${submissionCount > 0 ? `
    <div class="section-header">
      <h2>На модерации</h2>
    </div>
    <div class="meme-grid" id="sub-grid" style="margin-bottom: 2rem;">
      ${submissionsBody}
    </div>
    ` : ''}

    <div class="upload-card">
      <div class="upload-tabs">
        <button class="upload-tab active" onclick="switchTab('single', this)">Один мем</button>
        <button class="upload-tab" onclick="switchTab('bulk', this)">Массовая загрузка</button>
      </div>

      <div id="tab-single" class="tab-panel active">
        <form
          class="upload-form"
          hx-post="/memes"
          hx-target="#meme-grid"
          hx-swap="innerHTML"
          hx-encoding="multipart/form-data"
          hx-on::after-request="this.reset(); updateCount()"
        >
          <div class="field">
            <label for="name">Название</label>
            <input type="text" id="name" name="name" required placeholder="Как назовём?">
          </div>
          <div class="file-input-wrap">
            <label for="file">Картинка</label>
            <input type="file" id="file" name="file" accept="image/*" required>
          </div>
          <button type="submit" class="btn btn-accent">Загрузить</button>
        </form>
      </div>

      <div id="tab-bulk" class="tab-panel">
        <form
          id="bulk-form"
          hx-post="/memes/bulk"
          hx-target="#meme-grid"
          hx-swap="innerHTML"
          hx-encoding="multipart/form-data"
          hx-on::after-request="this.reset(); document.getElementById('file-count').textContent = ''; updateCount()"
        >
          <div
            class="drop-zone"
            id="drop-zone"
            onclick="document.getElementById('bulk-files').click()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p>Перетащи файлы сюда или <span class="accent">выбери</span></p>
            <p id="file-count" class="file-count"></p>
          </div>
          <input
            type="file"
            id="bulk-files"
            name="files"
            accept="image/*"
            multiple
            hidden
            onchange="document.getElementById('file-count').textContent = this.files.length + ' файл(ов) выбрано'"
          >
          <div style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-accent">Загрузить все</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      function switchTab(tab, btn) {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        btn.classList.add('active');
      }

      function updateCount() {
        document.getElementById('count').textContent = document.querySelectorAll('#meme-grid .meme-card').length + ' шт.';
      }

      function updateSubCount() {
        const subs = document.querySelectorAll('#sub-grid .sub-card').length;
        const badge = document.getElementById('sub-count');
        if (badge) {
          if (subs === 0) {
            badge.remove();
            const header = document.querySelector('#sub-grid')?.closest('.main')?.querySelector('.section-header');
            if (header) header.remove();
            document.getElementById('sub-grid')?.remove();
          } else {
            badge.textContent = subs + ' на модерации';
          }
        }
      }

      // Drag & drop
      const dz = document.getElementById('drop-zone');
      const bf = document.getElementById('bulk-files');
      ['dragenter','dragover'].forEach(e => dz.addEventListener(e, (ev) => { ev.preventDefault(); dz.classList.add('dragover'); }));
      ['dragleave','drop'].forEach(e => dz.addEventListener(e, () => dz.classList.remove('dragover')));
      dz.addEventListener('drop', (ev) => {
        ev.preventDefault();
        bf.files = ev.dataTransfer.files;
        document.getElementById('file-count').textContent = bf.files.length + ' файл(ов) выбрано';
      });
    </script>

    <div class="section-header">
      <h2>Коллекция</h2>
    </div>

    <div class="meme-grid" id="meme-grid">
      ${body}
    </div>

    ${chatStats}
  </main>

  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <img id="lightbox-img" src="" alt="" onclick="event.stopPropagation()">
  </div>

  <script>
    function openLightbox(src) {
      const lb = document.getElementById('lightbox');
      document.getElementById('lightbox-img').src = src;
      lb.classList.add('open');
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('open');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  </script>
</body>
</html>`;
}

export function memeRow(meme: {
  id: string;
  name: string;
  signedUrl: string;
  send_count?: number;
}) {
  const count = meme.send_count ?? 0;
  return `<div class="meme-card">
    <div class="meme-img-wrap" onclick="openLightbox('${meme.signedUrl}')">
      <img src="${meme.signedUrl}" alt="${meme.name}" loading="lazy">
    </div>
    <div class="meme-info">
      <div class="meme-meta">
        <span class="meme-name" title="${meme.name}">${meme.name}</span>
        <div class="meme-stats">${count} отпр.</div>
      </div>
      <button
        class="btn btn-danger"
        hx-delete="/memes/${meme.id}"
        hx-target="closest .meme-card"
        hx-swap="outerHTML"
        hx-confirm="Удалить мем?"
      >Удалить</button>
    </div>
  </div>`;
}

export function memeRows(
  memes: { id: string; name: string; signedUrl: string; send_count?: number }[]
) {
  if (memes.length === 0) {
    return `<div class="empty-state" style="grid-column: 1 / -1">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
      </svg>
      <p>Мемов пока нет. Загрузи первый!</p>
    </div>`;
  }
  return memes.map(memeRow).join("");
}

export function loadMoreButton(offset: number) {
  return `<div
    style="grid-column: 1 / -1; display: flex; justify-content: center; padding: 1rem 0;"
  >
    <button
      class="btn btn-accent"
      hx-get="/memes/page?offset=${offset}"
      hx-target="closest div"
      hx-swap="outerHTML"
    >Загрузить ещё</button>
  </div>`;
}

export function submissionRow(sub: {
  id: string;
  username: string | null;
  first_name: string;
  signedUrl: string;
}) {
  const user = sub.username ? `@${sub.username}` : sub.first_name;
  return `<div class="sub-card">
    <div class="meme-img-wrap" onclick="openLightbox('${sub.signedUrl}')">
      <img src="${sub.signedUrl}" alt="от ${user}" loading="lazy">
    </div>
    <div class="sub-info">
      <div class="sub-user">${user}</div>
      <div class="sub-actions">
        <button
          class="btn btn-approve"
          hx-post="/submissions/${sub.id}/approve"
          hx-target="closest .sub-card"
          hx-swap="outerHTML"
          hx-on::after-request="updateSubCount(); updateCount()"
        >Одобрить</button>
        <button
          class="btn btn-danger"
          hx-post="/submissions/${sub.id}/reject"
          hx-target="closest .sub-card"
          hx-swap="outerHTML"
          hx-on::after-request="updateSubCount()"
        >Отклонить</button>
      </div>
    </div>
  </div>`;
}

export function submissionRows(
  subs: {
    id: string;
    username: string | null;
    first_name: string;
    signedUrl: string;
  }[]
) {
  if (subs.length === 0) return "";
  return subs.map(submissionRow).join("");
}

export function chatStatsSection(
  chats: { chat_id: number; title: string; type: string; memes_sent: number }[]
) {
  if (chats.length === 0) return "";

  const typeLabels: Record<string, string> = {
    private: "лс",
    group: "группа",
    supergroup: "группа",
    channel: "канал",
  };

  const rows = chats
    .map(
      (c) => `<tr>
        <td>${c.title}</td>
        <td><span class="chat-type">${typeLabels[c.type] ?? c.type}</span></td>
        <td class="chat-count">${c.memes_sent}</td>
      </tr>`
    )
    .join("");

  const total = chats.reduce((s, c) => s + c.memes_sent, 0);

  return `
    <div class="chat-stats" style="margin-top: 2rem;">
      <h2>Чаты — ${chats.length} шт., ${total} мемов отправлено</h2>
      <table class="chat-table">
        <thead>
          <tr>
            <th>Чат</th>
            <th>Тип</th>
            <th>Мемов</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
