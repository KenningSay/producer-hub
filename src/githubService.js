// ─── GitHub API Service ───────────────────────────────────────────────────────
// All communication with GitHub happens here.
// Other modules never call fetch() directly — they use this service.

const REPO_PATH = 'data/tasks.json';

// ─── Read tasks ───────────────────────────────────────────────────────────────

export async function fetchTasks(owner, repo) {
  // Public read — no token needed
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${REPO_PATH}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error('FILE_NOT_FOUND');
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const json = await res.json();
  // Content is base64 encoded
  const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
  const tasks = JSON.parse(decoded);
  return { tasks, sha: json.sha };
}

// ─── Write tasks ──────────────────────────────────────────────────────────────

export async function pushTasks(owner, repo, token, tasks, sha) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${REPO_PATH}`;

  // Normalize tasks to clean format before saving
  const clean = tasks.map(t => ({
    id:          t.id,
    task:        t.task || t.text || '',
    status:      t.status || (t.done ? 'done' : 'pending'),
    category:    t.category || 'stream',
    date:        t.date || null,
    completedAt: t.completedAt || null,
  }));

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(clean, null, 2))));

  const body = {
    message: `update tasks ${new Date().toISOString().split('T')[0]}`,
    content,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub write error: ${res.status}`);
  }

  const result = await res.json();
  return result.content.sha; // return new SHA for next write
}

// ─── Normalize task format ────────────────────────────────────────────────────
// Converts both Gemini format {"task","status"} and our format {"text","done"}
// into a unified internal format

export function normalizeTask(raw, index) {
  const id = raw.id || (Date.now() + index);

  // Text: support both "task" (Gemini) and "text" (our format)
  const text = raw.task || raw.text || 'Без названия';

  // Done: support both "status" (Gemini) and "done" (our format)
  const done = raw.status === 'done' || raw.done === true;

  return {
    id,
    text,
    task: text, // keep both for write-back compatibility
    status: done ? 'done' : 'pending',
    done,
    category:    raw.category || 'stream',
    date:        raw.date || null,
    completedAt: raw.completedAt || null,
  };
}

export function normalizeTasks(raw) {
  return (Array.isArray(raw) ? raw : []).map(normalizeTask);
}
