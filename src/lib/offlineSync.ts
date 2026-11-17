import { useEffect, useState } from 'react';
import { LeaderboardEntry, Progress, SyncOp } from '../types/taekwondo';

const DB_NAME = 'tkd-kids-offline-db';
const DB_VERSION = 1;
const STORE_PROGRESS = 'progress';
const STORE_QUEUE = 'syncQueue';
const LS_PROGRESS_KEY = 'tkd_kids_progress_v1';
const LS_QUEUE_KEY = 'tkd_kids_sync_queue_v1';
const LS_LEADERBOARD_KEY = 'tkd_kids_leaderboard_cache_v1';
const LS_LAST_SYNC_KEY = 'tkd_kids_last_sync_v1';

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        db.createObjectStore(STORE_PROGRESS);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'opId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function loadLocalProgress(): Promise<Progress | null> {
  try {
    const db = await openIDB();
    if (db) {
      const val = await new Promise<Progress | null>((resolve) => {
        const tx = db.transaction(STORE_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_PROGRESS);
        const req = store.get('current');
        req.onsuccess = () => resolve((req.result as Progress) || null);
        req.onerror = () => resolve(null);
      });
      if (val) return val;
    }
  } catch {
    // Fallback to localStorage
  }
  try {
    const raw = localStorage.getItem(LS_PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}

export async function saveLocalProgress(progress: Progress): Promise<void> {
  try {
    localStorage.setItem(LS_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore quota errors
  }
  try {
    const db = await openIDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_PROGRESS, 'readwrite');
        tx.objectStore(STORE_PROGRESS).put(progress, 'current');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {
    // ignore
  }
}

export async function getSyncQueue(): Promise<SyncOp[]> {
  try {
    const db = await openIDB();
    if (db) {
      const items = await new Promise<SyncOp[]>((resolve) => {
        const tx = db.transaction(STORE_QUEUE, 'readonly');
        const req = tx.objectStore(STORE_QUEUE).getAll();
        req.onsuccess = () => resolve((req.result as SyncOp[]) || []);
        req.onerror = () => resolve([]);
      });
      if (items.length > 0) return items;
    }
  } catch {
    // fallback
  }
  try {
    const raw = localStorage.getItem(LS_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as SyncOp[]) : [];
  } catch {
    return [];
  }
}

export async function enqueueSyncOp(op: SyncOp): Promise<SyncOp[]> {
  const queue = await getSyncQueue();
  // Keep queue compact: collapse older STATE_SNAPSHOT ops if more than 1, preserve RESET ops
  const filtered = op.type === 'RESET' ? [] : queue.filter((q) => q.type !== 'STATE_SNAPSHOT');
  const next = [...filtered, op];

  try {
    localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  try {
    const db = await openIDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.clear();
        for (const item of next) store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {
    // ignore
  }
  return next;
}

export async function clearSyncedOps(appliedIds: string[]): Promise<SyncOp[]> {
  const queue = await getSyncQueue();
  const appliedSet = new Set(appliedIds);
  const remaining = queue.filter((q) => !appliedSet.has(q.opId));
  try {
    localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
  try {
    const db = await openIDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.clear();
        for (const item of remaining) store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {
    // ignore
  }
  return remaining;
}

export function getCachedLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LS_LEADERBOARD_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

export function setCachedLeaderboard(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem(LS_LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function getLastSyncedAt(): string {
  try {
    return localStorage.getItem(LS_LAST_SYNC_KEY) || '';
  } catch {
    return '';
  }
}

export async function syncWithServer(
  profileId: string,
  progress: Progress
): Promise<{
  ok: boolean;
  progress?: Progress;
  leaderboard?: LeaderboardEntry[];
  syncedAt?: string;
  remainingQueueCount: number;
}> {
  const queue = await getSyncQueue();
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId,
        ops: queue,
        progress,
      }),
    });
    if (!res.ok) throw new Error('Sync failed');
    const data = await res.json();
    const appliedIds: string[] = data.appliedOpIds || queue.map((q) => q.opId);
    const remaining = await clearSyncedOps(appliedIds);
    if (data.progress) {
      await saveLocalProgress(data.progress);
    }
    if (Array.isArray(data.leaderboard)) {
      setCachedLeaderboard(data.leaderboard);
    }
    if (data.syncedAt) {
      try {
        localStorage.setItem(LS_LAST_SYNC_KEY, data.syncedAt);
      } catch {
        // ignore
      }
    }
    return {
      ok: true,
      progress: data.progress,
      leaderboard: data.leaderboard,
      syncedAt: data.syncedAt,
      remainingQueueCount: remaining.length,
    };
  } catch {
    return {
      ok: false,
      remainingQueueCount: queue.length,
    };
  }
}

export async function fetchLeaderboardFromServer(): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.leaderboard)) {
      setCachedLeaderboard(data.leaderboard);
      return data.leaderboard;
    }
    return null;
  } catch {
    return null;
  }
}

export function getOrCreateProfileId(): string {
  try {
    const existing = localStorage.getItem('tkd_kids_profile_id');
    if (existing) return existing;
    const created = `athlete-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('tkd_kids_profile_id', created);
    return created;
  } catch {
    return 'athlete-local';
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
