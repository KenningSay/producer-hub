import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const FF = "'Share Tech Mono','Courier New',monospace";

export default function SyncStatus({ status, msg, lastSync, connected, onSync, hasToken }) {
  const fmt = d => d ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;

  const states = {
    idle:    { color: connected ? '#34D399' : '#4A7A8A', label: connected ? 'ONLINE' : 'LOCAL',  Icon: connected ? Wifi : WifiOff },
    syncing: { color: '#00C8FF', label: 'СИНК...',   Icon: RefreshCw },
    ok:      { color: '#34D399', label: 'ОБНОВЛЕНО', Icon: CheckCircle },
    error:   { color: '#FF6B35', label: 'ОШИБКА',    Icon: AlertCircle },
    offline: { color: '#4A7A8A', label: 'OFFLINE',   Icon: WifiOff },
  };

  const s = states[status] || states.idle;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: s.color, letterSpacing: '0.15em', fontFamily: FF }}>
        <s.Icon
          size={11}
          style={{ animation: status === 'syncing' ? 'spin 1s linear infinite' : 'none' }}
        />
        {s.label}
      </div>

      {/* Last sync time */}
      {lastSync && status !== 'syncing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#2A4A5A', fontFamily: FF }}>
          <Clock size={9}/>
          {fmt(lastSync)}
        </div>
      )}

      {/* Error message */}
      {status === 'error' && msg && (
        <div style={{ fontSize: 10, color: '#FF6B35', fontFamily: FF, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {msg}
        </div>
      )}

      {/* Manual sync button */}
      <button
        onClick={onSync}
        disabled={status === 'syncing'}
        title="Синхронизировать с GitHub"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'transparent',
          border: '1px solid rgba(0,200,255,0.15)',
          color: '#4A7A8A', borderRadius: 3,
          padding: '4px 10px', cursor: status === 'syncing' ? 'wait' : 'pointer',
          fontSize: 10, fontFamily: FF, letterSpacing: '0.1em',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.4)'; e.currentTarget.style.color = '#00C8FF'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.15)'; e.currentTarget.style.color = '#4A7A8A'; }}
      >
        <RefreshCw size={10} style={{ animation: status === 'syncing' ? 'spin 1s linear infinite' : 'none' }}/>
        SYNC
      </button>

      {!hasToken && (
        <div style={{ fontSize: 10, color: '#3A5A6A', fontFamily: FF }}>
          (только чтение — добавь токен для записи)
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
