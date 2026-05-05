import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const FF = "'Share Tech Mono','Courier New',monospace";

// Uploads tasks as tasks.json to .github/data/ in the repo
async function pushTasksToRepo({ token, owner, repo, tasks }) {
  const path = '.github/data/tasks.json';
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(tasks, null, 2))));

  // Check if file already exists (need SHA to update)
  let sha = null;
  try {
    const check = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (check.ok) sha = (await check.json()).sha;
  } catch {}

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `sync tasks ${new Date().toISOString().split('T')[0]}`,
        content,
        ...(sha ? { sha } : {}),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

export default function SyncButton({ tasks, archive, ghCfg }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [msg,    setMsg]    = useState('');
  const [lastSync, setLastSync] = useState(
    () => localStorage.getItem('pcc_last_sync') || null
  );

  const allTasks = [...tasks, ...archive];

  const sync = async () => {
    if (!ghCfg.token || !ghCfg.owner || !ghCfg.repo) {
      setMsg('Заполни настройки GitHub сначала');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('loading');
    setMsg('');

    try {
      await pushTasksToRepo({
        token: ghCfg.token,
        owner: ghCfg.owner,
        repo: ghCfg.repo,
        tasks: allTasks,
      });

      const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      setLastSync(now);
      localStorage.setItem('pcc_last_sync', now);
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      setMsg(e.message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const colors = {
    idle:    { bg: 'rgba(0,200,255,0.08)',  border: 'rgba(0,200,255,0.25)', color: '#00C8FF' },
    loading: { bg: 'rgba(0,200,255,0.08)',  border: 'rgba(0,200,255,0.25)', color: '#00C8FF' },
    ok:      { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.4)', color: '#34D399' },
    error:   { bg: 'rgba(255,107,53,0.12)', border: 'rgba(255,107,53,0.4)', color: '#FF6B35' },
  };
  const c = colors[status];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={sync}
        disabled={status === 'loading'}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: c.bg, border: `1px solid ${c.border}`, color: c.color,
          borderRadius: 3, padding: '8px 16px', cursor: status === 'loading' ? 'wait' : 'pointer',
          fontSize: 12, fontFamily: FF, letterSpacing: '0.1em', transition: 'all 0.2s',
        }}
      >
        {status === 'loading' && (
          <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }}/>
        )}
        {status === 'ok' && <CheckCircle size={13}/>}
        {status === 'error' && <AlertCircle size={13}/>}
        {status === 'idle' && <RefreshCw size={13}/>}

        {status === 'idle'    && 'СИНК С TELEGRAM'}
        {status === 'loading' && 'СИНХРОНИЗИРУЕМ...'}
        {status === 'ok'      && 'СИНХРОНИЗИРОВАНО'}
        {status === 'error'   && 'ОШИБКА'}
      </button>

      <div style={{ fontSize: 10, color: '#3A6A7A', fontFamily: FF }}>
        {status === 'error' && msg && (
          <span style={{ color: '#FF6B35' }}>{msg}</span>
        )}
        {status !== 'error' && lastSync && (
          <span>последний синк: {lastSync}</span>
        )}
        {status !== 'error' && !lastSync && (
          <span style={{ color: '#2A4A5A' }}>{allTasks.length} задач готово к отправке</span>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
