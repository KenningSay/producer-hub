// ─── useGitHub hook ───────────────────────────────────────────────────────────
// Handles all GitHub sync logic:
//   • Auto-polling every 30s
//   • Manual sync
//   • Writing back on task change
//   • LocalStorage fallback when GitHub is unavailable

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTasks, pushTasks, normalizeTasks } from './githubService.js';

const POLL_INTERVAL = 30_000; // 30 seconds
const LS_TASKS_KEY  = 'pcc_tasks3';
const LS_SHA_KEY    = 'pcc_gh_sha';

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function useGitHub({ owner, repo, token }) {
  const [tasks,      setTasksRaw]  = useState(() => loadLS(LS_TASKS_KEY, []));
  const [sha,        setSha]       = useState(() => localStorage.getItem(LS_SHA_KEY) || null);
  const [syncStatus, setSyncStatus]= useState('idle'); // idle | syncing | ok | error | offline
  const [syncMsg,    setSyncMsg]   = useState('');
  const [lastSync,   setLastSync]  = useState(null);
  const [connected,  setConnected] = useState(false);

  const shaRef   = useRef(sha);
  const tasksRef = useRef(tasks);
  const writing  = useRef(false); // prevent concurrent writes

  shaRef.current   = sha;
  tasksRef.current = tasks;

  // ── Persist to localStorage whenever tasks change ──
  const setTasks = useCallback((updater) => {
    setTasksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveLS(LS_TASKS_KEY, next);
      return next;
    });
  }, []);

  // ── Pull from GitHub ──
  const pull = useCallback(async (silent = false) => {
    if (!owner || !repo) return;
    if (!silent) setSyncStatus('syncing');

    try {
      const { tasks: raw, sha: newSha } = await fetchTasks(owner, repo);
      const normalized = normalizeTasks(raw);

      setTasks(normalized);
      setSha(newSha);
      shaRef.current = newSha;
      localStorage.setItem(LS_SHA_KEY, newSha);

      setConnected(true);
      setLastSync(new Date());
      if (!silent) setSyncStatus('ok');
      setSyncMsg('');
      setTimeout(() => { if (!silent) setSyncStatus('idle'); }, 2000);

      return normalized;
    } catch (e) {
      if (e.message === 'FILE_NOT_FOUND') {
        // File doesn't exist yet — that's ok, we'll create it on first write
        setConnected(true);
        if (!silent) setSyncStatus('ok');
        setTimeout(() => { if (!silent) setSyncStatus('idle'); }, 2000);
      } else {
        setConnected(false);
        setSyncStatus('error');
        setSyncMsg(e.message);
        setTimeout(() => setSyncStatus('offline'), 3000);
      }
    }
  }, [owner, repo, setTasks]);

  // ── Push to GitHub ──
  const push = useCallback(async (newTasks) => {
    if (!token || !owner || !repo) return; // read-only mode
    if (writing.current) return;
    writing.current = true;

    try {
      const newSha = await pushTasks(owner, repo, token, newTasks, shaRef.current);
      setSha(newSha);
      shaRef.current = newSha;
      localStorage.setItem(LS_SHA_KEY, newSha);
    } catch (e) {
      console.warn('Push failed:', e.message);
      // Don't crash — changes are safe in localStorage
    } finally {
      writing.current = false;
    }
  }, [owner, repo, token]);

  // ── setTasks + auto-push ──
  const setTasksAndSync = useCallback((updater) => {
    setTasksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveLS(LS_TASKS_KEY, next);
      // Push to GitHub asynchronously — don't block UI
      if (token) push(next);
      return next;
    });
  }, [push, token]);

  // ── Auto-polling ──
  useEffect(() => {
    if (!owner || !repo) return;
    // Initial pull
    pull(true);
    // Poll every 30s
    const id = setInterval(() => pull(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [owner, repo, pull]);

  return {
    tasks,
    setTasks: setTasksAndSync,    // use this for all task mutations
    setTasksLocal: setTasks,       // use this for local-only changes (archive etc)
    syncStatus,
    syncMsg,
    lastSync,
    connected,
    pull,                          // manual sync
  };
}
