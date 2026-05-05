const https = require('https');
const fs    = require('fs');
const path  = require('path');

const TOKEN   = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() { return toDateStr(new Date()); }

function getHourMSK() {
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
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
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

  // Read tasks from file in repo
  let tasks = [];
  const tasksPath = path.join(__dirname, '../data/tasks.json');
  try {
    const raw = fs.readFileSync(tasksPath, 'utf8');
    tasks = JSON.parse(raw);
    console.log(`Loaded ${tasks.length} tasks from tasks.json`);
  } catch (e) {
    console.log('tasks.json not found or invalid, using empty list');
  }

  const today      = todayStr();
  const hourMSK    = getHourMSK();
  const isMorning  = hourMSK < 12;

  const activeTasks     = tasks.filter(t => !t.done);
  const todayTasks      = activeTasks.filter(t => t.date === today);
  const backlog         = activeTasks.filter(t => !t.date);

  const now = new Date();
  const dateLabel = now.toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  let message = '';

  if (isMorning) {
    // ── УТРЕННИЙ ДАЙДЖЕСТ ──
    message += `🌅 <b>ДОБРОЕ УТРО, ПРОДЮСЕР</b>\n`;
    message += `📅 ${dateLabel}\n\n`;

    if (todayTasks.length === 0) {
      message += `✨ На сегодня задач нет\nДобавь план: <a href="https://hub.layerp.ru">hub.layerp.ru</a>\n`;
    } else {
      message += `<b>📋 ЗАДАЧИ НА СЕГОДНЯ — ${todayTasks.length} шт:</b>\n`;
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
    const completedToday = tasks.filter(t => {
      if (!t.done || !t.completedAt) return false;
      return toDateStr(new Date(t.completedAt)) === today;
    });

    message += `🌆 <b>ВЕЧЕРНИЙ ОТЧЁТ</b>\n`;
    message += `📅 ${dateLabel}\n\n`;

    if (completedToday.length > 0) {
      message += `✅ <b>СДЕЛАНО СЕГОДНЯ — ${completedToday.length} шт:</b>\n`;
      completedToday.forEach(t => { message += `  ✓ ${t.text}\n`; });
    } else {
      message += `😅 Сегодня задачи ещё не закрыты\n`;
    }

    if (todayTasks.length > 0) {
      message += `\n⏳ <b>ОСТАЛОСЬ НА СЕГОДНЯ — ${todayTasks.length} шт:</b>\n`;
      todayTasks.forEach(t => { message += `  • ${t.text}\n`; });
    } else if (completedToday.length > 0) {
      message += `\n🔥 Все задачи на сегодня выполнены!\n`;
    }

    const totalActive = activeTasks.length;
    message += `\n📊 Всего активных задач: <b>${totalActive}</b>`;
    if (backlog.length > 0) message += ` (${backlog.length} в бэклоге)`;
    message += `\n\n🎯 <a href="https://hub.layerp.ru">Открыть дашборд</a>`;
  }

  console.log('Sending message...\n', message);
  await sendMessage(message);
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
