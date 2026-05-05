const https = require('https');

const TOKEN   = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const RAW     = process.env.TASKS_DATA;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() { return toDateStr(new Date()); }

function getHourMSK() {
  // GitHub Actions runs in UTC, convert to MSK (UTC+3)
  return (new Date().getUTCHours() + 3) % 24;
}

const CAT_EMOJI = { '3d': '🖨', stream: '🎮', coding: '💻', content: '🎬' };
const CAT_LABEL = { '3d': '3D Печать', stream: 'Стрим', coding: 'Кодинг', content: 'Контент' };

// ─── Send message ─────────────────────────────────────────────────────────────

function sendMessage(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.ok) resolve(json);
        else reject(new Error(json.description));
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!TOKEN || !CHAT_ID) {
    console.error('Missing TELEGRAM_TOKEN or TELEGRAM_CHAT_ID');
    process.exit(1);
  }

  // Parse tasks from secret (JSON array)
  let tasks = [];
  try {
    tasks = RAW ? JSON.parse(RAW) : [];
  } catch (e) {
    console.log('No tasks data or invalid JSON, sending empty report');
  }

  const today    = todayStr();
  const hourMSK  = getHourMSK();
  const isMorning = hourMSK < 12;

  const activeTasks  = tasks.filter(t => !t.done);
  const todayTasks   = activeTasks.filter(t => t.date === today);
  const doneTasks    = tasks.filter(t => t.done);
  const backlog      = activeTasks.filter(t => !t.date);

  // ── Date label ──
  const now = new Date();
  const dateLabel = now.toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  let message = '';

  if (isMorning) {
    // ── УТРЕННИЙ ДАЙДЖЕСТ ──
    message += `🌅 <b>ДОБРОЕ УТРО, ПРОДЮСЕР</b>\n`;
    message += `📅 ${dateLabel}\n\n`;

    if (todayTasks.length === 0) {
      message += `✨ На сегодня задач нет — добавь план на <a href="https://hub.layerp.ru">hub.layerp.ru</a>\n`;
    } else {
      message += `<b>📋 ЗАДАЧИ НА СЕГОДНЯ (${todayTasks.length}):</b>\n`;
      // Group by category
      const grouped = {};
      todayTasks.forEach(t => {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t);
      });
      for (const [cat, catTasks] of Object.entries(grouped)) {
        message += `\n${CAT_EMOJI[cat] || '▸'} <b>${CAT_LABEL[cat] || cat}</b>\n`;
        catTasks.forEach(t => { message += `  • ${t.text}\n`; });
      }
    }

    if (backlog.length > 0) {
      message += `\n📦 В бэклоге ещё <b>${backlog.length}</b> задач\n`;
    }

    message += `\n🎯 <a href="https://hub.layerp.ru">Открыть дашборд</a>`;

  } else {
    // ── ВЕЧЕРНИЙ ОТЧЁТ ──
    const completedToday = doneTasks.filter(t => {
      if (!t.completedAt) return false;
      return toDateStr(new Date(t.completedAt)) === today;
    });

    message += `🌆 <b>ВЕЧЕРНИЙ ОТЧЁТ</b>\n`;
    message += `📅 ${dateLabel}\n\n`;

    // Done today
    if (completedToday.length > 0) {
      message += `✅ <b>СДЕЛАНО СЕГОДНЯ (${completedToday.length}):</b>\n`;
      completedToday.forEach(t => {
        message += `  ✓ ${t.text}\n`;
      });
    } else {
      message += `😅 Сегодня задачи ещё не закрыты\n`;
    }

    // Remaining today
    if (todayTasks.length > 0) {
      message += `\n⏳ <b>ОСТАЛОСЬ НА СЕГОДНЯ (${todayTasks.length}):</b>\n`;
      todayTasks.forEach(t => { message += `  • ${t.text}\n`; });
    } else if (completedToday.length > 0) {
      message += `\n🔥 Все задачи на сегодня выполнены!\n`;
    }

    // Stats
    const totalActive = activeTasks.length;
    message += `\n📊 Всего активных задач: <b>${totalActive}</b>`;
    if (backlog.length > 0) message += ` (${backlog.length} в бэклоге)`;

    message += `\n\n🎯 <a href="https://hub.layerp.ru">Открыть дашборд</a>`;
  }

  console.log('Sending message...');
  console.log(message);

  await sendMessage(message);
  console.log('Message sent successfully!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
