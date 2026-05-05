import { useState, useEffect, useRef } from "react";
import {
  Target,
  Zap,
  Cpu,
  Film,
  Radio,
  X,
  Upload,
  FolderOpen,
  Settings,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader,
  Key,
  Archive,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import STLViewer from "./STLViewer.jsx";
import CalendarView from "./CalendarView.jsx";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "3d",
    label: "3D Печать",
    color: "#FF6B35",
    bg: "rgba(255,107,53,0.12)",
    border: "rgba(255,107,53,0.35)",
  },
  {
    id: "stream",
    label: "Стрим",
    color: "#00C8FF",
    bg: "rgba(0,200,255,0.10)",
    border: "rgba(0,200,255,0.35)",
  },
  {
    id: "coding",
    label: "Кодинг",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.35)",
  },
  {
    id: "content",
    label: "Контент",
    color: "#34D399",
    bg: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.35)",
  },
];

const GOAL = 100000;
const FF = "'Share Tech Mono','Courier New',monospace";

function todayStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

const DEFAULT_TASKS = [
  {
    id: 1,
    text: "Найти STL жетона BF6",
    category: "3d",
    date: todayStr(),
    done: false,
  },
  {
    id: 2,
    text: "Установить Cursor",
    category: "coding",
    date: todayStr(),
    done: false,
  },
  {
    id: 3,
    text: "Снять прогрев в Reels",
    category: "content",
    date: null,
    done: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load(key, fb) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
}
function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/stl|3d|печат|модел|пластик|slicer|cura|принт|нить/i.test(t)) return "3d";
  if (/стрим|stream|live|twitch|obs|overlay|донат|вещани/i.test(t))
    return "stream";
  if (
    /код|code|git|npm|react|vite|cursor|программ|deploy|api|сайт|репо/i.test(t)
  )
    return "coding";
  if (
    /reels|видео|фото|контент|съёмк|съемк|монтаж|youtube|tiktok|пост|ролик/i.test(
      t,
    )
  )
    return "content";
  return "stream";
}

function parseAIPlan(text) {
  const tasks = [];
  let curDate = null;
  const today = todayStr();
  const nextWeekDay = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const l = line.toLowerCase();
    if (/сегодня|today|\bдень\b|\bday\b|на день/i.test(l) && line.length < 60) {
      curDate = today;
      continue;
    }
    if (/завтра|tomorrow/i.test(l) && line.length < 60) {
      curDate = nextWeekDay(1);
      continue;
    }
    if (/недел|week/i.test(l) && line.length < 60) {
      curDate = null;
      continue;
    }
    if (/месяц|month/i.test(l) && line.length < 60) {
      curDate = null;
      continue;
    }
    const m = line.match(/^(?:[-*•·✅☐□▸►→✓\d]+[.):\s]+)\s*(.+)/);
    const taskText = m
      ? m[1].trim()
      : line.length > 3 && line.length < 200 && !/^#+/.test(line)
        ? line
        : null;
    if (taskText)
      tasks.push({
        text: taskText,
        category: detectCategory(taskText),
        date: curDate,
      });
  }
  return tasks;
}

async function uploadToGitHub({ token, owner, repo, path, fileObj, onStatus }) {
  onStatus("Читаем файл...");
  const base64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(fileObj);
  });
  onStatus("Проверяем...");
  let sha = null;
  try {
    const c = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (c.ok) sha = (await c.json()).sha;
  } catch {}
  onStatus("Загружаем...");
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload ${path} via Producer Hub`,
        content: base64,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  root: {
    background: "#080B0F",
    minHeight: "100vh",
    fontFamily: FF,
    color: "#D0E4EF",
    fontSize: 15,
  },
  scan: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage:
      "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,200,255,0.010) 3px,rgba(0,200,255,0.010) 4px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  wrap: {
    maxWidth: 920,
    margin: "0 auto",
    padding: "24px 20px 60px",
    position: "relative",
    zIndex: 1,
  },
  panel: (a = "rgba(0,200,255,0.2)") => ({
    background: "rgba(13,18,24,0.85)",
    border: `1px solid ${a}`,
    borderRadius: 4,
    padding: "18px 20px",
    marginBottom: 16,
    position: "relative",
  }),
  lbl: {
    fontSize: 11,
    letterSpacing: "0.25em",
    color: "#3A6A7A",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  card: {
    background: "rgba(13,18,24,0.9)",
    border: "1px solid rgba(0,200,255,0.1)",
    borderRadius: 4,
    padding: "12px 16px",
  },
  inp: (a = "rgba(0,200,255,0.2)") => ({
    background: "rgba(0,200,255,0.04)",
    border: `1px solid ${a}`,
    borderRadius: 3,
    padding: "9px 13px",
    color: "#C0D8E4",
    fontSize: 14,
    fontFamily: FF,
    outline: "none",
  }),
  sel: {
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(0,200,255,0.2)",
    borderRadius: 3,
    padding: "9px 10px",
    color: "#7AB8C8",
    fontSize: 13,
    fontFamily: FF,
    outline: "none",
  },
  btn: (c = "#00C8FF") => ({
    background: `rgba(${c === "#00C8FF" ? "0,200,255" : c === "#FF6B35" ? "255,107,53" : "167,139,250"},0.12)`,
    border: `1px solid ${c}`,
    color: c,
    borderRadius: 3,
    padding: "9px 18px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: FF,
    letterSpacing: "0.1em",
  }),
  ghost: {
    background: "transparent",
    border: "1px solid rgba(0,200,255,0.15)",
    color: "#4A7A8A",
    borderRadius: 3,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: FF,
    letterSpacing: "0.1em",
  },
  iBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 5,
    color: "#2A4A5A",
    display: "flex",
    alignItems: "center",
  },
  pill: (c) => ({
    fontSize: 11,
    letterSpacing: "0.12em",
    padding: "3px 9px",
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.color,
    borderRadius: 2,
  }),
  mainTab: (a, c) => ({
    flex: 1,
    background: a
      ? `rgba(${c === "blue" ? "0,200,255" : "167,139,250"},0.1)`
      : "transparent",
    border: "1px solid rgba(0,200,255,0.15)",
    borderRadius: 0,
    padding: "10px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: FF,
    color: a ? (c === "blue" ? "#00C8FF" : "#A78BFA") : "#3A6A7A",
    letterSpacing: "0.2em",
  }),
};

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ onClose, onImport }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const today = todayStr();

  const parse = () => setPreview(parseAIPlan(text));
  const upd = (i, f, v) =>
    setPreview((p) => p.map((t, j) => (j === i ? { ...t, [f]: v } : t)));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#0D1117",
          border: "1px solid rgba(0,200,255,0.3)",
          borderRadius: 6,
          width: "100%",
          maxWidth: 700,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <Sparkles size={16} color="#00C8FF" />
          <span
            style={{ fontSize: 14, letterSpacing: "0.2em", color: "#00C8FF" }}
          >
            ИМПОРТ ПЛАНА
          </span>
          <button style={{ ...S.iBtn, marginLeft: "auto" }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {!preview ? (
          <>
            <div
              style={{
                fontSize: 12,
                color: "#3A6A7A",
                marginBottom: 10,
                letterSpacing: "0.1em",
                lineHeight: 1.7,
              }}
            >
              Вставь план. Разделы «На сегодня:» → попадают на сегодня. «На
              неделю:» / «На месяц:» → в бэклог, оттуда перетащишь в нужный
              день.
            </div>
            <textarea
              style={{
                ...S.inp(),
                width: "100%",
                minHeight: 220,
                resize: "vertical",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
              placeholder={
                "На сегодня:\n- Найти STL жетона BF6\n- Снять прогрев в Reels\n\nНа неделю:\n- Установить Cursor\n- Залить код на GitHub"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button style={S.btn()} onClick={parse} disabled={!text.trim()}>
                РАЗОБРАТЬ
              </button>
              <button style={S.ghost} onClick={onClose}>
                ОТМЕНА
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 12,
                color: "#3A6A7A",
                marginBottom: 12,
                letterSpacing: "0.1em",
              }}
            >
              Найдено:{" "}
              <span style={{ color: "#00C8FF" }}>{preview.length}</span> задач
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {preview.map((t, i) => {
                const cat =
                  CATEGORIES.find((c) => c.id === t.category) || CATEGORIES[0];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(0,200,255,0.1)",
                      borderRadius: 3,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 13, color: "#C0D8E4" }}>
                      {t.text}
                    </span>
                    <select
                      style={{ ...S.sel, padding: "4px 6px", fontSize: 11 }}
                      value={t.category}
                      onChange={(e) => upd(i, "category", e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      style={{ ...S.sel, padding: "4px 6px", fontSize: 11 }}
                      value={t.date || "null"}
                      onChange={(e) =>
                        upd(
                          i,
                          "date",
                          e.target.value === "null" ? null : e.target.value,
                        )
                      }
                    >
                      <option value={today}>Сегодня</option>
                      <option value="null">Бэклог</option>
                    </select>
                    <button
                      style={{ ...S.iBtn, color: "#FF4A4A" }}
                      onClick={() =>
                        setPreview((p) => p.filter((_, j) => j !== i))
                      }
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={S.btn()}
                onClick={() => {
                  onImport(preview);
                  onClose();
                }}
              >
                ДОБАВИТЬ {preview.length} ЗАДАЧ
              </button>
              <button style={S.ghost} onClick={() => setPreview(null)}>
                НАЗАД
              </button>
              <button
                style={{ ...S.ghost, marginLeft: "auto" }}
                onClick={onClose}
              >
                ОТМЕНА
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Archive Panel ────────────────────────────────────────────────────────────

function ArchivePanel({ archive, onRestore, onClear }) {
  const [open, setOpen] = useState(false);
  if (archive.length === 0) return null;

  const grouped = archive.reduce((acc, t) => {
    const day = new Date(t.completedAt).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(t);
    return acc;
  }, {});

  return (
    <div style={S.panel("rgba(52,211,153,0.15)")}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <Archive size={13} color="#34D399" />
        <span style={{ ...S.lbl, margin: 0, color: "#34D399" }}>
          ▸ АРХИВ ВЫПОЛНЕННОГО
        </span>
        <span style={{ fontSize: 12, color: "#34D399", marginLeft: 6 }}>
          ({archive.length})
        </span>
        <span style={{ marginLeft: "auto", color: "#2A6A4A" }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>
      {open && (
        <div style={{ marginTop: 14 }}>
          {Object.entries(grouped)
            .reverse()
            .map(([day, tasks]) => (
              <div key={day} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#2A6A4A",
                    letterSpacing: "0.2em",
                    marginBottom: 6,
                  }}
                >
                  {day.toUpperCase()}
                </div>
                {tasks.map((t) => {
                  const cat =
                    CATEGORIES.find((c) => c.id === t.category) ||
                    CATEGORIES[0];
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 12px",
                        background: "rgba(52,211,153,0.04)",
                        border: "1px solid rgba(52,211,153,0.08)",
                        borderRadius: 3,
                        marginBottom: 4,
                      }}
                    >
                      <CheckCircle size={13} color="#2A6A4A" />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: "#2A6A4A",
                          textDecoration: "line-through",
                        }}
                      >
                        {t.text}
                      </span>
                      <span style={S.pill(cat)}>{cat.label.toUpperCase()}</span>
                      <button
                        style={{ ...S.iBtn, color: "#2A6A4A" }}
                        onClick={() => onRestore(t.id)}
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          <button
            style={{
              ...S.ghost,
              fontSize: 11,
              marginTop: 4,
              color: "#FF4A4A",
              borderColor: "rgba(255,74,74,0.2)",
            }}
            onClick={onClear}
          >
            ОЧИСТИТЬ АРХИВ
          </button>
        </div>
      )}
    </div>
  );
}

// ─── GitHub Settings ──────────────────────────────────────────────────────────

function GithubSettings({ cfg, setCfg }) {
  const [open, setOpen] = useState(!cfg.token);
  const upd = (k) => (e) =>
    setCfg((prev) => {
      const n = { ...prev, [k]: e.target.value };
      save("pcc_gh", n);
      return n;
    });
  return (
    <div style={S.panel("rgba(167,139,250,0.2)")}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <Settings size={12} color="#A78BFA" />
        <span style={{ ...S.lbl, margin: 0, color: "#A78BFA" }}>
          ▸ НАСТРОЙКИ GITHUB
        </span>
        <span
          style={{
            fontSize: 11,
            marginLeft: "auto",
            color: cfg.token ? "#34D399" : "#FF6B35",
          }}
        >
          ● {cfg.token ? "ПОДКЛЮЧЕНО" : "НЕТ ТОКЕНА"}
        </span>
      </div>
      {open && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#3A6A7A" }}>
            GitHub → Settings → Developer settings → Personal access tokens →
            Classic → scope: repo
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Key size={11} color="#A78BFA" />
            <input
              style={{ ...S.inp("rgba(167,139,250,0.3)"), flex: 1 }}
              type="password"
              placeholder="ghp_xxxxxxxx..."
              value={cfg.token}
              onChange={upd("token")}
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#3A6A7A", marginBottom: 4 }}>
                OWNER
              </div>
              <input
                style={{ ...S.inp(), width: "100%" }}
                placeholder="username"
                value={cfg.owner}
                onChange={upd("owner")}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#3A6A7A", marginBottom: 4 }}>
                REPO
              </div>
              <input
                style={{ ...S.inp(), width: "100%" }}
                placeholder="producer-hub"
                value={cfg.repo}
                onChange={upd("repo")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upload Panel ─────────────────────────────────────────────────────────────

function UploadPanel({ cfg }) {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState("assets/stl");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState([]);
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const addFiles = (list) => setFiles((p) => [...p, ...Array.from(list)]);
  const extColor = (name) =>
    ({
      stl: "#FF6B35",
      png: "#00C8FF",
      jpg: "#00C8FF",
      jpeg: "#00C8FF",
      gif: "#A78BFA",
      mp4: "#34D399",
    })[name.split(".").pop().toLowerCase()] || "#888";

  const upload = async () => {
    if (!cfg.token || !cfg.owner || !cfg.repo) {
      alert("Заполни настройки GitHub!");
      return;
    }
    setBusy(true);
    const res = [];
    for (const f of files) {
      const p = `${folder.replace(/\/$/, "")}/${f.name}`;
      try {
        await uploadToGitHub({
          token: cfg.token,
          owner: cfg.owner,
          repo: cfg.repo,
          path: p,
          fileObj: f,
          onStatus: setStatus,
        });
        res.push({
          name: f.name,
          ok: true,
          url: `https://github.com/${cfg.owner}/${cfg.repo}/blob/main/${p}`,
        });
      } catch (e) {
        res.push({ name: f.name, ok: false, error: e.message });
      }
    }
    setResults(res);
    setFiles([]);
    setBusy(false);
    setStatus("");
  };

  return (
    <div style={S.panel()}>
      <div style={S.lbl}>▸ ЗАГРУЗКА ФАЙЛОВ В РЕПОЗИТОРИЙ</div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <FolderOpen size={13} color="#4A7A8A" />
        <span style={{ fontSize: 11, color: "#4A7A8A" }}>ПАПКА:</span>
        <input
          style={{ ...S.inp(), width: 220, padding: "6px 11px", fontSize: 13 }}
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        />
        <span style={{ fontSize: 11, color: "#2A4A5A" }}>
          → {cfg.owner || "owner"}/{cfg.repo || "repo"}
        </span>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => ref.current.click()}
        style={{
          border: `1px dashed ${drag ? "#00C8FF" : "rgba(0,200,255,0.2)"}`,
          borderRadius: 4,
          padding: 20,
          textAlign: "center",
          cursor: "pointer",
          background: drag ? "rgba(0,200,255,0.05)" : "transparent",
          marginBottom: 10,
        }}
      >
        <Upload
          size={20}
          color={drag ? "#00C8FF" : "#2A5A6A"}
          style={{ margin: "0 auto 6px" }}
        />
        <div style={{ fontSize: 13, color: drag ? "#00C8FF" : "#4A7A8A" }}>
          {drag ? "ОТПУСТИ" : "ПЕРЕТАЩИ ФАЙЛЫ ИЛИ НАЖМИ"}
        </div>
        <div style={{ fontSize: 11, color: "#2A4A5A", marginTop: 3 }}>
          STL · PNG · JPG · MP4 · ZIP · любые файлы
        </div>
        <input
          ref={ref}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 3,
                marginBottom: 5,
              }}
            >
              <span
                style={{ fontSize: 11, color: extColor(f.name), minWidth: 36 }}
              >
                {f.name.split(".").pop().toUpperCase()}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: "#8AACBA" }}>
                {f.name}
              </span>
              <span style={{ fontSize: 11, color: "#3A5A6A" }}>
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                style={S.iBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setFiles((p) => p.filter((_, j) => j !== i));
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          <button
            style={{
              ...S.btn(),
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
            }}
            onClick={upload}
            disabled={busy}
          >
            {busy ? (
              <Loader
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Upload size={12} />
            )}
            {busy
              ? status || "ЗАГРУЖАЕМ..."
              : `ЗАГРУЗИТЬ ${files.length} ФАЙЛ${files.length > 1 ? "А" : ""}`}
          </button>
        </>
      )}
      {results.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 8px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 3,
                marginBottom: 4,
              }}
            >
              {r.ok ? (
                <CheckCircle size={13} color="#34D399" />
              ) : (
                <AlertCircle size={13} color="#FF6B35" />
              )}
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: r.ok ? "#34D399" : "#FF6B35",
                }}
              >
                {r.name}
              </span>
              {r.ok && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    color: "#00C8FF",
                    fontSize: 11,
                    textDecoration: "none",
                  }}
                >
                  GitHub <ExternalLink size={10} />
                </a>
              )}
              {!r.ok && (
                <span style={{ fontSize: 11, color: "#FF6B35" }}>
                  {r.error}
                </span>
              )}
            </div>
          ))}
          <button
            style={{ ...S.ghost, fontSize: 11, marginTop: 4 }}
            onClick={() => setResults([])}
          >
            ОЧИСТИТЬ
          </button>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = load("pcc_tasks3", null);
    if (saved) return saved;
    // migrate from old format
    const old = load("pcc_tasks2", null) || load("pcc_tasks", DEFAULT_TASKS);
    return old.map((t) => ({
      ...t,
      date:
        t.date !== undefined ? t.date : t.period === "day" ? todayStr() : null,
    }));
  });
  const [archive, setArchive] = useState(() => load("pcc_archive", []));
  const [donated, setDonated] = useState(() => load("pcc_donated", 0));
  const [donIn, setDonIn] = useState("");
  const [tab, setTab] = useState("tasks");
  const [showImport, setShowImport] = useState(false);
  const [ghCfg, setGhCfg] = useState(() =>
    load("pcc_gh", { token: "", owner: "", repo: "" }),
  );
  const nextId = useRef(Date.now());

  useEffect(() => {
    save("pcc_tasks3", tasks);
  }, [tasks]);
  useEffect(() => {
    save("pcc_archive", archive);
  }, [archive]);
  useEffect(() => {
    save("pcc_donated", donated);
  }, [donated]);

  const activeTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((doneTasks.length / total) * 100);
  const goalPct = Math.min(100, Math.round((donated / GOAL) * 100));
  const todayTasks = activeTasks.filter((t) => t.date === todayStr()).length;

  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.done) return;
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: true } : t)));
    setTimeout(() => {
      setTasks((p) => p.filter((t) => t.id !== id));
      setArchive((p) => [
        { ...task, done: true, completedAt: Date.now() },
        ...p,
      ]);
    }, 500);
  };

  const deleteTask = (id) => setTasks((p) => p.filter((t) => t.id !== id));
  const restoreTask = (id) => {
    const task = archive.find((t) => t.id === id);
    if (!task) return;
    setArchive((p) => p.filter((t) => t.id !== id));
    setTasks((p) => [...p, { ...task, done: false, completedAt: undefined }]);
  };

  const importTasks = (parsed) => {
    setTasks((p) => [
      ...p,
      ...parsed.map((t) => ({ ...t, id: nextId.current++, done: false })),
    ]);
  };

  const applyDonate = () => {
    const v = parseFloat(donIn.replace(/[^\d.]/g, ""));
    if (!isNaN(v) && v >= 0) setDonated(v);
    setDonIn("");
  };

  return (
    <div style={S.root}>
      <link
        href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
        rel="stylesheet"
      />
      <div style={S.scan} />
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={importTasks}
        />
      )}
      <div style={S.wrap}>
        {/* HEADER */}
        <div
          style={{
            borderBottom: "1px solid rgba(0,200,255,0.2)",
            paddingBottom: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#00C8FF",
                    boxShadow: "0 0 6px #00C8FF",
                  }}
                />
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#00C8FF",
                    margin: 0,
                    textShadow: "0 0 20px rgba(0,200,255,0.3)",
                  }}
                >
                  PRODUCER CONTROL CENTER v3.0
                </h1>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#4A7A8A",
                  letterSpacing: "0.2em",
                  marginTop: 4,
                  marginBottom: 0,
                }}
              >
                ▸ ЦЕЛЬ: 100 000 ₽ &nbsp;|&nbsp;{" "}
                {new Date()
                  .toLocaleDateString("ru-RU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                  .toUpperCase()}
              </p>
            </div>
            <div
              style={{
                textAlign: "right",
                fontSize: 10,
                color: "#2A4A5A",
                letterSpacing: "0.15em",
                lineHeight: 1.9,
              }}
            >
              <div>
                STATUS: <span style={{ color: "#34D399" }}>ONLINE</span>
              </div>
              <div>BUILD: 2025.06</div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[
            { v: `${pct}%`, l: "ВЫПОЛНЕНО", c: "#00C8FF" },
            { v: archive.length, l: "В АРХИВЕ", c: "#34D399" },
            { v: todayTasks, l: "НА СЕГОДНЯ", c: "#FF9B35" },
            {
              v: donated.toLocaleString("ru-RU") + " ₽",
              l: "ДОНАТОВ",
              c: "#FF9B6A",
              fs: 20,
            },
          ].map(({ v, l, c, fs }, i) => (
            <div key={i} style={S.card}>
              <div
                style={{
                  fontSize: fs || 32,
                  fontWeight: 700,
                  color: c,
                  lineHeight: 1.1,
                }}
              >
                {v}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#3A6A7A",
                  letterSpacing: "0.2em",
                  marginTop: 3,
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>

        {/* GOAL */}
        <div style={S.panel("rgba(255,107,53,0.3)")}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 14,
              height: 14,
              borderTop: "2px solid #00C8FF",
              borderLeft: "2px solid #00C8FF",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 14,
              height: 14,
              borderTop: "2px solid #00C8FF",
              borderRight: "2px solid #00C8FF",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 14,
              height: 14,
              borderBottom: "2px solid #00C8FF",
              borderLeft: "2px solid #00C8FF",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 14,
              height: 14,
              borderBottom: "2px solid #00C8FF",
              borderRight: "2px solid #00C8FF",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                color: "#FF6B35",
              }}
            >
              ▸ ПРОГРЕСС К ЦЕЛИ
            </span>
            <span style={{ fontSize: 13, color: "#FF9B6A" }}>
              {donated.toLocaleString("ru-RU")} ₽ / 100 000 ₽ —{" "}
              <strong style={{ color: "#FF6B35" }}>{goalPct}%</strong>
            </span>
          </div>
          <div
            style={{
              height: 10,
              background: "rgba(255,107,53,0.08)",
              borderRadius: 2,
              border: "1px solid rgba(255,107,53,0.15)",
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${goalPct}%`,
                background: "linear-gradient(90deg,#FF6B35,#FF9B35)",
                borderRadius: 2,
                transition: "width 0.6s",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Target size={13} color="#FF6B35" />
            <input
              style={{
                ...S.inp("rgba(255,107,53,0.25)"),
                width: 200,
                background: "rgba(255,107,53,0.06)",
                color: "#FF9B6A",
              }}
              placeholder="Введи сумму донатов"
              value={donIn}
              onChange={(e) => setDonIn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyDonate()}
            />
            <button style={S.btn("#FF6B35")} onClick={applyDonate}>
              ОБНОВИТЬ
            </button>
            <span
              style={{ fontSize: 11, color: "#3A4A5A", marginLeft: "auto" }}
            >
              ОСТАЛОСЬ: {Math.max(0, GOAL - donated).toLocaleString("ru-RU")} ₽
            </span>
          </div>
        </div>

        {/* MAIN TABS */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
          <button
            style={S.mainTab(tab === "tasks", "blue")}
            onClick={() => setTab("tasks")}
          >
            ЗАДАЧИ
          </button>
          <button
            style={S.mainTab(tab === "files", "purple")}
            onClick={() => setTab("files")}
          >
            ФАЙЛЫ / GITHUB
          </button>
        </div>

        {/* ── TASKS TAB ── */}
        {tab === "tasks" && (
          <>
            {/* Import button */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 10,
              }}
            >
              <button
                style={{
                  ...S.btn("#A78BFA"),
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={() => setShowImport(true)}
              >
                <Sparkles size={13} /> ИМПОРТ ПЛАНА
              </button>
            </div>

            {/* Calendar */}
            <CalendarView
              tasks={tasks}
              setTasks={setTasks}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />

            {/* Category breakdown */}
            <div style={S.panel()}>
              <div style={S.lbl}>▸ ПО КАТЕГОРИЯМ</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                  gap: 8,
                }}
              >
                {CATEGORIES.map((cat) => {
                  const ct = tasks.filter(
                    (t) => t.category === cat.id && !t.done,
                  );
                  const cd = archive.filter((t) => t.category === cat.id);
                  const total2 = ct.length + cd.length;
                  const cp =
                    total2 === 0 ? 0 : Math.round((cd.length / total2) * 100);
                  return (
                    <div
                      key={cat.id}
                      style={{
                        background: cat.bg,
                        border: `1px solid ${cat.border}`,
                        borderRadius: 3,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: cat.color,
                          letterSpacing: "0.15em",
                          marginBottom: 6,
                        }}
                      >
                        {cat.label.toUpperCase()}
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: cat.color,
                          lineHeight: 1,
                        }}
                      >
                        {cp}%
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#3A5A6A", marginTop: 3 }}
                      >
                        {cd.length} сделано / {ct.length} в работе
                      </div>
                      <div
                        style={{
                          height: 3,
                          background: "rgba(0,0,0,0.3)",
                          borderRadius: 1,
                          marginTop: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${cp}%`,
                            background: cat.color,
                            borderRadius: 1,
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Archive */}
            <ArchivePanel
              archive={archive}
              onRestore={restoreTask}
              onClear={() => setArchive([])}
            />
          </>
        )}

        {/* ── FILES TAB ── */}
        {tab === "files" && (
          <>
            <STLViewer />
            <GithubSettings cfg={ghCfg} setCfg={setGhCfg} />
            <UploadPanel cfg={ghCfg} />
            <div style={S.panel("rgba(52,211,153,0.2)")}>
              <div style={S.lbl}>▸ БЫСТРЫЕ ССЫЛКИ</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  {
                    l: "Репозиторий",
                    u: `https://github.com/${ghCfg.owner}/${ghCfg.repo}`,
                  },
                  {
                    l: "GitHub Pages",
                    u: `https://${ghCfg.owner}.github.io/${ghCfg.repo}`,
                  },
                  {
                    l: "assets/stl",
                    u: `https://github.com/${ghCfg.owner}/${ghCfg.repo}/tree/main/assets/stl`,
                  },
                  {
                    l: "assets/img",
                    u: `https://github.com/${ghCfg.owner}/${ghCfg.repo}/tree/main/assets/img`,
                  },
                ].map(({ l, u }, i) => (
                  <a
                    key={i}
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 12px",
                      background: "rgba(52,211,153,0.06)",
                      border: "1px solid rgba(52,211,153,0.15)",
                      borderRadius: 3,
                      color: "#34D399",
                      fontSize: 12,
                      textDecoration: "none",
                      letterSpacing: "0.08em",
                    }}
                  >
                    <ExternalLink size={11} /> {l}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        <div
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "#1A3A4A",
            letterSpacing: "0.2em",
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Zap size={10} color="#1A3A4A" /> PRODUCER CONTROL CENTER — POWERED BY
          PERSISTENCE & COFFEE
        </div>
      </div>
    </div>
  );
}
