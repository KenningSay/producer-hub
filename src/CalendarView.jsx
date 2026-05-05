import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Trash2,
  X,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const FF = "'Share Tech Mono','Courier New',monospace";
const DAYS_SHORT = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const DAYS_FULL = [
  "ПОНЕДЕЛЬНИК",
  "ВТОРНИК",
  "СРЕДА",
  "ЧЕТВЕРГ",
  "ПЯТНИЦА",
  "СУББОТА",
  "ВОСКРЕСЕНЬЕ",
];
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const CATS = [
  {
    id: "3d",
    label: "3D Печать",
    color: "#FF6B35",
    bg: "rgba(255,107,53,0.15)",
    border: "rgba(255,107,53,0.4)",
  },
  {
    id: "stream",
    label: "Стрим",
    color: "#00C8FF",
    bg: "rgba(0,200,255,0.12)",
    border: "rgba(0,200,255,0.4)",
  },
  {
    id: "coding",
    label: "Кодинг",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.4)",
  },
  {
    id: "content",
    label: "Контент",
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.4)",
  },
];
const getCat = (id) => CATS.find((c) => c.id === id) || CATS[1];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return toDateStr(new Date());
}

function getWeekDays(offsetWeeks) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function dayIndex(d) {
  return (d.getDay() + 6) % 7;
} // Mon=0 … Sun=6

// ─── AddTaskForm ──────────────────────────────────────────────────────────────

function AddTaskForm({ onAdd, onCancel }) {
  const [text, setText] = useState("");
  const [cat, setCat] = useState("stream");
  const ref = useRef();
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    onAdd(text.trim(), cat);
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "rgba(0,200,255,0.04)",
        borderTop: "1px solid rgba(0,200,255,0.1)",
      }}
    >
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Новая задача..."
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginBottom: 8,
          background: "rgba(0,200,255,0.06)",
          border: "1px solid rgba(0,200,255,0.3)",
          borderRadius: 3,
          padding: "8px 12px",
          color: "#C0D8E4",
          fontSize: 13,
          fontFamily: FF,
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(0,200,255,0.2)",
            borderRadius: 3,
            padding: "7px 8px",
            color: "#7AB8C8",
            fontSize: 12,
            fontFamily: FF,
            outline: "none",
          }}
        >
          {CATS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          style={{
            background: "rgba(0,200,255,0.12)",
            border: "1px solid #00C8FF",
            color: "#00C8FF",
            borderRadius: 3,
            padding: "7px 18px",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: FF,
          }}
        >
          ДОБАВИТЬ
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "1px solid rgba(0,200,255,0.15)",
            color: "#4A7A8A",
            borderRadius: 3,
            padding: "7px 10px",
            cursor: "pointer",
            fontFamily: FF,
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── DayDetail ────────────────────────────────────────────────────────────────
// Full task list for a selected day

function DayDetail({ day, tasks, onToggle, onDelete, onAdd, onMoveToBacklog }) {
  const [adding, setAdding] = useState(false);
  const today = todayStr();
  const dateStr = toDateStr(day);
  const isToday = dateStr === today;

  const dayName = DAYS_FULL[dayIndex(day)];
  const dateLabel = `${day.getDate()} ${MONTHS[day.getMonth()]}`;

  return (
    <div
      style={{
        background: "rgba(8,11,15,0.8)",
        border: `1px solid ${isToday ? "rgba(0,200,255,0.35)" : "rgba(0,200,255,0.15)"}`,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(0,200,255,0.1)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: isToday ? "#00C8FF" : "#3A6A7A",
              letterSpacing: "0.25em",
            }}
          >
            {dayName}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: isToday ? "#00C8FF" : "#8AACBA",
              marginTop: 1,
              letterSpacing: "0.05em",
            }}
          >
            {dateLabel}
            {isToday && (
              <span
                style={{
                  fontSize: 10,
                  color: "#00C8FF",
                  marginLeft: 10,
                  letterSpacing: "0.2em",
                  opacity: 0.7,
                }}
              >
                СЕГОДНЯ
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: adding ? "rgba(0,200,255,0.12)" : "transparent",
            border: "1px solid rgba(0,200,255,0.25)",
            color: "#00C8FF",
            borderRadius: 3,
            padding: "7px 14px",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: FF,
          }}
        >
          <Plus size={13} /> ЗАДАЧА
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <AddTaskForm
          onAdd={(text, cat) => {
            onAdd(text, cat, dateStr);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Task list */}
      <div style={{ padding: tasks.length === 0 ? "20px 16px" : "8px 0" }}>
        {tasks.length === 0 && (
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#2A4A5A",
              letterSpacing: "0.15em",
            }}
          >
            — НЕТ ЗАДАЧ — нажми + чтобы добавить
          </div>
        )}

        {tasks.map((task, i) => {
          const cat = getCat(task.category);
          return (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 16px",
                borderBottom:
                  i < tasks.length - 1
                    ? "1px solid rgba(0,200,255,0.06)"
                    : "none",
                borderLeft: `3px solid ${cat.color}`,
                background: "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,200,255,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {/* Check */}
              <button
                onClick={() => onToggle(task.id)}
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 0",
                  display: "flex",
                  color: cat.color,
                  marginTop: 1,
                }}
              >
                <Check size={15} />
              </button>

              {/* Text block */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Task text — wraps, max 3 lines */}
                <div
                  style={{
                    fontSize: 14,
                    color: "#C0D8E4",
                    fontFamily: FF,
                    lineHeight: 1.5,
                    // 3-line clamp
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                >
                  {task.text}
                </div>
                {/* Category badge */}
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 5,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    padding: "2px 8px",
                    background: cat.bg,
                    border: `1px solid ${cat.border}`,
                    color: cat.color,
                    borderRadius: 2,
                  }}
                >
                  {cat.label.toUpperCase()}
                </span>
              </div>

              {/* Actions */}
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => onDelete(task.id)}
                  title="Удалить"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 3,
                    color: "#2A4A5A",
                    display: "flex",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#FF6B6B")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#2A4A5A")
                  }
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => onMoveToBacklog(task.id)}
                  title="В бэклог"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 3,
                    color: "#2A4A5A",
                    display: "flex",
                    fontSize: 10,
                    fontFamily: FF,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#A78BFA")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#2A4A5A")
                  }
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WeekStrip ────────────────────────────────────────────────────────────────
// Compact 7-column strip. Click a day to select it.

function DayCell({ day, tasks, isSelected, isToday, isPast, onClick }) {
  const dateStr = toDateStr(day);
  // Get unique category colors for dots
  const catColors = [...new Set(tasks.map((t) => t.category))].map(
    (id) => getCat(id).color,
  );

  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 4px",
        borderRadius: 6,
        cursor: "pointer",
        background: isSelected
          ? "rgba(0,200,255,0.12)"
          : isToday
            ? "rgba(0,200,255,0.05)"
            : "transparent",
        border: `1px solid ${isSelected ? "rgba(0,200,255,0.4)" : isToday ? "rgba(0,200,255,0.2)" : "transparent"}`,
        transition: "all 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "rgba(0,200,255,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = isToday
            ? "rgba(0,200,255,0.05)"
            : "transparent";
      }}
    >
      {/* Day name */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.15em",
          color: isSelected
            ? "#00C8FF"
            : isToday
              ? "#00C8FF"
              : isPast
                ? "#2A3A4A"
                : "#4A7A8A",
          marginBottom: 4,
        }}
      >
        {DAYS_SHORT[dayIndex(day)]}
      </div>

      {/* Date number */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          color: isSelected
            ? "#00C8FF"
            : isToday
              ? "#00C8FF"
              : isPast
                ? "#2A3A4A"
                : "#7AACBA",
          textShadow:
            isSelected || isToday ? "0 0 12px rgba(0,200,255,0.35)" : "none",
          marginBottom: 6,
        }}
      >
        {day.getDate()}
      </div>

      {/* Category dots */}
      <div
        style={{
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
          minHeight: 10,
        }}
      >
        {catColors.slice(0, 4).map((c, i) => (
          <div
            key={i}
            style={{ width: 6, height: 6, borderRadius: "50%", background: c }}
          />
        ))}
      </div>

      {/* Task count */}
      {tasks.length > 0 && (
        <div
          style={{
            marginTop: 5,
            fontSize: 11,
            fontWeight: 700,
            color: isSelected ? "#00C8FF" : "#3A6A7A",
          }}
        >
          {tasks.length}
        </div>
      )}
    </div>
  );
}

// ─── BacklogPanel ─────────────────────────────────────────────────────────────

function BacklogPanel({ tasks, onToggle, onDelete, onAdd, onMoveToDay, days }) {
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const SHOW = 8;
  const shown = expanded ? tasks : tasks.slice(0, SHOW);

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(167,139,250,0.15)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom:
            tasks.length > 0 || adding
              ? "1px solid rgba(167,139,250,0.1)"
              : "none",
        }}
      >
        <span
          style={{ fontSize: 11, color: "#A78BFA", letterSpacing: "0.2em" }}
        >
          ▸ БЭКЛОГ
        </span>
        <span style={{ fontSize: 11, color: "#3A3A6A" }}>
          — задачи без даты, назначь на день
        </span>
        {tasks.length > 0 && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 13,
              color: "#A78BFA",
              fontWeight: 700,
            }}
          >
            {tasks.length}
          </span>
        )}
        <button
          onClick={() => setAdding((a) => !a)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: adding ? "rgba(167,139,250,0.12)" : "transparent",
            border: "1px solid rgba(167,139,250,0.25)",
            color: "#A78BFA",
            borderRadius: 3,
            padding: "5px 12px",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: FF,
          }}
        >
          <Plus size={11} /> ЗАДАЧА
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <AddTaskForm
          onAdd={(text, cat) => {
            onAdd(text, cat);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Empty */}
      {tasks.length === 0 && !adding && (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            fontSize: 12,
            color: "#1A2A3A",
            letterSpacing: "0.1em",
          }}
        >
          — пусто — сюда попадают задачи из импорта
        </div>
      )}

      {/* Task list */}
      {tasks.length > 0 && (
        <div style={{ padding: "8px 0" }}>
          {shown.map((task, i) => {
            const cat = getCat(task.category);
            return (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 16px",
                  borderBottom:
                    i < shown.length - 1
                      ? "1px solid rgba(167,139,250,0.06)"
                      : "none",
                  borderLeft: `3px solid ${cat.color}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(167,139,250,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <button
                  onClick={() => onToggle(task.id)}
                  style={{
                    flexShrink: 0,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 0",
                    color: cat.color,
                    display: "flex",
                  }}
                >
                  <Check size={14} />
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#C0D8E4",
                      fontFamily: FF,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    {task.text}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      padding: "2px 7px",
                      background: cat.bg,
                      border: `1px solid ${cat.border}`,
                      color: cat.color,
                      borderRadius: 2,
                    }}
                  >
                    {cat.label.toUpperCase()}
                  </span>
                </div>

                {/* Assign to day select */}
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) onMoveToDay(task.id, e.target.value);
                    }}
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(0,200,255,0.2)",
                      borderRadius: 3,
                      padding: "4px 6px",
                      color: "#7AB8C8",
                      fontSize: 11,
                      fontFamily: FF,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" disabled>
                      → день
                    </option>
                    {days.map((d) => (
                      <option key={toDateStr(d)} value={toDateStr(d)}>
                        {DAYS_SHORT[dayIndex(d)]} {d.getDate()}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onDelete(task.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 3,
                      color: "#2A4A5A",
                      display: "flex",
                      justifyContent: "center",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#FF6B6B")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#2A4A5A")
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Show more / less */}
          {!expanded && tasks.length > SHOW && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#4A6A7A",
                fontSize: 12,
                fontFamily: FF,
                padding: "10px",
                cursor: "pointer",
                letterSpacing: "0.1em",
              }}
            >
              ещё {tasks.length - SHOW} задач ↓
            </button>
          )}
          {expanded && tasks.length > SHOW && (
            <button
              onClick={() => setExpanded(false)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#3A5A6A",
                fontSize: 12,
                fontFamily: FF,
                padding: "10px",
                cursor: "pointer",
                letterSpacing: "0.1em",
              }}
            >
              свернуть ↑
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CalendarView (main export) ───────────────────────────────────────────────

export default function CalendarView({ tasks, setTasks, onToggle, onDelete }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayStr()); // selected day string
  const nextId = useRef(Date.now() + 99999);

  const days = getWeekDays(weekOffset);
  const today = todayStr();

  // When week changes, keep selection or default to today if in view
  useEffect(() => {
    const inView = days.some((d) => toDateStr(d) === selectedDate);
    if (!inView) setSelectedDate(toDateStr(days[0]));
  }, [weekOffset]);

  const active = tasks.filter((t) => !t.done);
  const forDay = (d) => active.filter((t) => t.date === toDateStr(d));
  const backlog = active.filter((t) => !t.date);

  const selectedDay =
    days.find((d) => toDateStr(d) === selectedDate) || days[0];
  const selectedTasks = active.filter((t) => t.date === selectedDate);

  const addTask = (text, cat, date = null) => {
    setTasks((p) => [
      ...p,
      { id: nextId.current++, text, category: cat, date, done: false },
    ]);
  };

  const moveToBacklog = (id) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, date: null } : t)));
  const moveToDay = (id, date) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, date } : t)));

  // Week label
  const d0 = days[0],
    d6 = days[6];
  const weekLabel = `${d0.getDate()} ${MONTHS[d0.getMonth()]} — ${d6.getDate()} ${MONTHS[d6.getMonth()]} ${d6.getFullYear()}`;

  // Category legend (total active)
  const catCounts = CATS.map((c) => ({
    ...c,
    n: active.filter((t) => t.category === c.id).length,
  })).filter((c) => c.n > 0);

  return (
    <div
      style={{
        background: "rgba(13,18,24,0.85)",
        border: "1px solid rgba(0,200,255,0.2)",
        borderRadius: 4,
        padding: "18px 20px",
        marginBottom: 16,
      }}
    >
      {/* ── Week navigation ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "1px solid rgba(0,200,255,0.15)",
            borderRadius: 3,
            padding: "6px 10px",
            cursor: "pointer",
            color: "#4A7A8A",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 13,
            color: "#00C8FF",
            letterSpacing: "0.1em",
          }}
        >
          {weekLabel}
        </span>
        <button
          onClick={() => {
            setWeekOffset(0);
            setSelectedDate(today);
          }}
          style={{
            flexShrink: 0,
            background:
              weekOffset === 0 ? "rgba(0,200,255,0.1)" : "transparent",
            border: "1px solid rgba(0,200,255,0.2)",
            borderRadius: 3,
            padding: "6px 12px",
            cursor: "pointer",
            color: "#00C8FF",
            fontSize: 11,
            fontFamily: FF,
          }}
        >
          СЕГОДНЯ
        </button>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "1px solid rgba(0,200,255,0.15)",
            borderRadius: 3,
            padding: "6px 10px",
            cursor: "pointer",
            color: "#4A7A8A",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Category legend ── */}
      {catCounts.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {catCounts.map((c) => (
            <span
              key={c.id}
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                padding: "3px 10px",
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.color,
                borderRadius: 2,
              }}
            >
              {c.label.toUpperCase()} {c.n}
            </span>
          ))}
        </div>
      )}

      {/* ── Week strip — 7 equal cells ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 4,
          marginBottom: 14,
        }}
      >
        {days.map((d, i) => (
          <DayCell
            key={i}
            day={d}
            tasks={forDay(d)}
            isSelected={toDateStr(d) === selectedDate}
            isToday={toDateStr(d) === today}
            isPast={toDateStr(d) < today}
            onClick={() => setSelectedDate(toDateStr(d))}
          />
        ))}
      </div>

      {/* ── Day detail panel ── */}
      <div style={{ marginBottom: 14 }}>
        <DayDetail
          day={selectedDay}
          tasks={selectedTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          onAdd={addTask}
          onMoveToBacklog={moveToBacklog}
        />
      </div>

      {/* ── Backlog ── */}
      <BacklogPanel
        tasks={backlog}
        onToggle={onToggle}
        onDelete={onDelete}
        onAdd={(text, cat) => addTask(text, cat, null)}
        onMoveToDay={moveToDay}
        days={days}
      />

      {/* ── Hint ── */}
      <div
        style={{
          fontSize: 11,
          color: "#1A3A4A",
          letterSpacing: "0.1em",
          marginTop: 10,
          textAlign: "center",
        }}
      >
        НАЖМИ НА ДЕНЬ → список задач · БЭКЛОГ → выбери день в выпадающем меню
      </div>
    </div>
  );
}
