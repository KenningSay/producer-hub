import { useState, useRef, useEffect } from 'react';
import { CheckSquare, Square, Trash2, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';

const FF = "'Share Tech Mono','Courier New',monospace";
const DAY_NAMES = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];

const CATEGORIES = [
  { id: "3d",      label: "3D Печать", color: "#FF6B35", bg: "rgba(255,107,53,0.15)", border: "rgba(255,107,53,0.4)" },
  { id: "stream",  label: "Стрим",     color: "#00C8FF", bg: "rgba(0,200,255,0.12)",  border: "rgba(0,200,255,0.4)" },
  { id: "coding",  label: "Кодинг",    color: "#A78BFA", bg: "rgba(167,139,250,0.12)",border: "rgba(167,139,250,0.4)" },
  { id: "content", label: "Контент",   color: "#34D399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.4)" },
];

function fmt(d) {
  return d.toISOString().split('T')[0];
}
function todayStr() {
  const d = new Date(); d.setHours(0,0,0,0); return fmt(d);
}
function getMonday(d) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d); mon.setDate(diff); mon.setHours(0,0,0,0);
  return mon;
}

export default function CalendarView({ tasks, setTasks, onToggle, onDelete }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [addingTo,   setAddingTo]   = useState(null);
  const [newText,    setNewText]    = useState('');
  const [newCat,     setNewCat]     = useState('stream');
  const [dragTask,   setDragTask]   = useState(null);
  const [dragOver,   setDragOver]   = useState(null);
  const addRef = useRef();
  const nextId = useRef(Date.now() + 9999);

  useEffect(() => {
    if (addingTo && addRef.current) addRef.current.focus();
  }, [addingTo]);

  // Week days
  const base = new Date(); base.setHours(0,0,0,0);
  const monday = getMonday(base);
  monday.setDate(monday.getDate() + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });

  const today = todayStr();
  const activeTasks = tasks.filter(t => !t.done);
  const tasksForDay = (d) => activeTasks.filter(t => t.date === fmt(d));
  const backlog     = activeTasks.filter(t => !t.date);

  const weekLabel = `${days[0].toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} — ${days[6].toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}`;

  const addTask = (date) => {
    if (!newText.trim()) return;
    setTasks(p => [...p, { id: nextId.current++, text: newText.trim(), category: newCat, date, done: false }]);
    setNewText(''); setAddingTo(null);
  };

  const moveTask = (taskId, newDate) => {
    setTasks(p => p.map(t => t.id === taskId ? { ...t, date: newDate || null } : t));
  };

  const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[1];

  // Drag handlers
  const onDragStart = (e, task) => { setDragTask(task); e.dataTransfer.effectAllowed = 'move'; };
  const onDragEnd   = ()         => { setDragTask(null); setDragOver(null); };
  const onDrop      = (e, date)  => {
    e.preventDefault();
    if (dragTask) moveTask(dragTask.id, date);
    setDragOver(null); setDragTask(null);
  };

  const TaskCard = ({ task, compact }) => {
    const cat = getCat(task.category);
    return (
      <div
        draggable
        onDragStart={e => onDragStart(e, task)}
        onDragEnd={onDragEnd}
        style={{
          background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 3,
          padding: compact ? '5px 7px' : '7px 10px',
          marginBottom: 5, cursor: 'grab', display: 'flex', gap: 5, alignItems: 'flex-start',
          opacity: dragTask?.id === task.id ? 0.4 : 1, transition: 'opacity 0.15s',
        }}
      >
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1, display: 'flex' }}
          onClick={() => onToggle(task.id)}
        >
          <Square size={11} color={cat.color} />
        </button>
        <span style={{ flex: 1, fontSize: compact ? 10 : 11, color: '#C0D8E4', lineHeight: 1.35, fontFamily: FF, wordBreak: 'break-word' }}>
          {task.text}
        </span>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex', marginTop: 1 }}
          onClick={() => onDelete(task.id)}
        >
          <X size={9} color="#2A4A5A" />
        </button>
      </div>
    );
  };

  return (
    <div style={{ background: "rgba(13,18,24,0.85)", border: "1px solid rgba(0,200,255,0.2)", borderRadius: 4, padding: "18px 20px", marginBottom: 16 }}>

      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          style={{ background: 'transparent', border: '1px solid rgba(0,200,255,0.15)', borderRadius: 3, padding: '5px 10px', cursor: 'pointer', color: '#4A7A8A', display: 'flex', alignItems: 'center' }}
        ><ChevronLeft size={14} /></button>

        <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#00C8FF', letterSpacing: '0.12em' }}>{weekLabel}</span>

        <button
          onClick={() => setWeekOffset(0)}
          style={{ background: weekOffset === 0 ? 'rgba(0,200,255,0.1)' : 'transparent', border: '1px solid rgba(0,200,255,0.2)', borderRadius: 3, padding: '5px 10px', cursor: 'pointer', color: '#00C8FF', fontSize: 10, fontFamily: FF, letterSpacing: '0.1em' }}
        >СЕГОДНЯ</button>

        <button
          onClick={() => setWeekOffset(w => w + 1)}
          style={{ background: 'transparent', border: '1px solid rgba(0,200,255,0.15)', borderRadius: 3, padding: '5px 10px', cursor: 'pointer', color: '#4A7A8A', display: 'flex', alignItems: 'center' }}
        ><ChevronRight size={14} /></button>
      </div>

      {/* 7-day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 16 }}>
        {days.map((d, i) => {
          const dateStr  = fmt(d);
          const isToday  = dateStr === today;
          const isPast   = dateStr < today;
          const dayTasks = tasksForDay(d);
          const isOver   = dragOver === dateStr;

          return (
            <div
              key={i}
              onDragOver={e => { e.preventDefault(); setDragOver(dateStr); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, dateStr)}
              style={{
                background: isOver ? 'rgba(0,200,255,0.08)' : isToday ? 'rgba(0,200,255,0.06)' : 'rgba(8,11,15,0.6)',
                border: `1px solid ${isOver ? 'rgba(0,200,255,0.5)' : isToday ? 'rgba(0,200,255,0.35)' : 'rgba(0,200,255,0.08)'}`,
                borderRadius: 4, padding: '8px 6px', minHeight: 140,
                display: 'flex', flexDirection: 'column', transition: 'all 0.15s',
              }}
            >
              {/* Day header */}
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: isToday ? '#00C8FF' : isPast ? '#2A3A4A' : '#3A6A7A', letterSpacing: '0.2em' }}>
                  {DAY_NAMES[i]}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 700, lineHeight: 1.1, marginTop: 2,
                  color: isToday ? '#00C8FF' : isPast ? '#2A3A4A' : '#5A8A9A',
                  textShadow: isToday ? '0 0 12px rgba(0,200,255,0.4)' : 'none',
                }}>{d.getDate()}</div>
                {dayTasks.length > 0 && (
                  <div style={{ fontSize: 9, color: isToday ? '#00C8FF' : '#3A5A6A', marginTop: 2 }}>
                    {dayTasks.length} задач
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div style={{ flex: 1 }}>
                {dayTasks.map(task => <TaskCard key={task.id} task={task} compact />)}
              </div>

              {/* Add button */}
              {addingTo === dateStr ? (
                <div style={{ marginTop: 4 }}>
                  <input
                    ref={addRef}
                    style={{
                      background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.25)',
                      borderRadius: 3, padding: '5px 6px', color: '#C0D8E4', fontSize: 10,
                      fontFamily: FF, outline: 'none', width: '100%', boxSizing: 'border-box',
                    }}
                    placeholder="Задача..."
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addTask(dateStr);
                      if (e.key === 'Escape') { setAddingTo(null); setNewText(''); }
                    }}
                  />
                  <select
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,200,255,0.15)', borderRadius: 3, padding: '3px 4px', color: '#7AB8C8', fontSize: 9, fontFamily: FF, outline: 'none', width: '100%', marginTop: 3, boxSizing: 'border-box' }}
                    value={newCat} onChange={e => setNewCat(e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                    <button onClick={() => addTask(dateStr)} style={{ flex: 1, background: 'rgba(0,200,255,0.12)', border: '1px solid rgba(0,200,255,0.3)', color: '#00C8FF', borderRadius: 2, padding: '3px 0', cursor: 'pointer', fontSize: 9, fontFamily: FF }}>OK</button>
                    <button onClick={() => { setAddingTo(null); setNewText(''); }} style={{ background: 'transparent', border: '1px solid rgba(0,200,255,0.1)', color: '#3A6A7A', borderRadius: 2, padding: '3px 5px', cursor: 'pointer', fontSize: 9 }}>✕</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTo(dateStr)}
                  style={{ background: 'transparent', border: '1px dashed rgba(0,200,255,0.1)', borderRadius: 3, color: '#2A5A6A', cursor: 'pointer', fontSize: 16, padding: '3px', width: '100%', marginTop: 4, transition: 'all 0.15s', fontFamily: FF }}
                  onMouseEnter={e => { e.target.style.borderColor = 'rgba(0,200,255,0.3)'; e.target.style.color = '#00C8FF'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'rgba(0,200,255,0.1)'; e.target.style.color = '#2A5A6A'; }}
                >+</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Backlog */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver('backlog'); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={e => onDrop(e, null)}
        style={{
          background: dragOver === 'backlog' ? 'rgba(167,139,250,0.06)' : 'rgba(0,0,0,0.2)',
          border: `1px solid ${dragOver === 'backlog' ? 'rgba(167,139,250,0.4)' : 'rgba(167,139,250,0.12)'}`,
          borderRadius: 4, padding: '12px 14px', transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: backlog.length ? 10 : 0 }}>
          <span style={{ fontSize: 10, color: '#A78BFA', letterSpacing: '0.2em' }}>▸ БЭКЛОГ</span>
          <span style={{ fontSize: 10, color: '#4A4A7A' }}>— задачи без даты, перетащи в нужный день</span>
          {backlog.length > 0 && <span style={{ fontSize: 10, color: '#A78BFA', marginLeft: 'auto' }}>{backlog.length} задач</span>}
        </div>
        {backlog.length === 0 && (
          <div style={{ fontSize: 11, color: '#1A2A3A', textAlign: 'center', padding: '8px 0', letterSpacing: '0.1em' }}>
            — ПУСТО — сюда попадают задачи из импорта
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
          {backlog.map(task => <TaskCard key={task.id} task={task} compact={false} />)}
        </div>
        {/* Add to backlog */}
        <button
          onClick={() => setAddingTo('__backlog__')}
          style={{ background: 'transparent', border: '1px dashed rgba(167,139,250,0.15)', borderRadius: 3, color: '#3A3A6A', cursor: 'pointer', fontSize: 12, padding: '5px', width: '100%', marginTop: backlog.length ? 8 : 0, fontFamily: FF, letterSpacing: '0.1em' }}
        >+ В БЭКЛОГ</button>
        {addingTo === '__backlog__' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <input
              autoFocus
              style={{ flex: 1, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 3, padding: '7px 10px', color: '#C0D8E4', fontSize: 12, fontFamily: FF, outline: 'none' }}
              placeholder="Новая задача в бэклог..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { if (!newText.trim()) return; setTasks(p => [...p, { id: nextId.current++, text: newText.trim(), category: newCat, date: null, done: false }]); setNewText(''); setAddingTo(null); }
                if (e.key === 'Escape') { setAddingTo(null); setNewText(''); }
              }}
            />
            <select style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 3, padding: '7px 6px', color: '#7AB8C8', fontSize: 11, fontFamily: FF, outline: 'none' }} value={newCat} onChange={e => setNewCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button onClick={() => setAddingTo(null)} style={{ background: 'transparent', border: '1px solid rgba(0,200,255,0.1)', color: '#3A6A7A', borderRadius: 3, padding: '7px 10px', cursor: 'pointer', fontFamily: FF }}><X size={12}/></button>
          </div>
        )}
      </div>
    </div>
  );
}
