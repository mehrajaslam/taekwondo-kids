import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'dojo-db.json');

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  beltIndex: number;
  streak: number;
  lessonsDone: number;
  quizWins: number;
  medals: { gold: number; silver: number; bronze: number };
  updatedAt: string;
  isPeer?: boolean;
}

interface SyncOp {
  opId: string;
  type: 'STATE_SNAPSHOT' | 'XP_EARNED' | 'LESSON_COMPLETED' | 'FIGHT_SAVED' | 'RESET';
  timestamp: string;
  payload: any;
}

interface DojoDB {
  profiles: Record<string, any>;
  appliedOps: Record<string, string[]>;
  peers: LeaderboardEntry[];
}

const THRESHOLDS = [0, 100, 200, 300, 400, 500, 600, 750, 900, 1100, 1300, 1500, 1750, 2000, 2300];

function getBeltIndex(xp: number): number {
  let idx = 0;
  THRESHOLDS.forEach((t, i) => {
    if (xp >= t) idx = i;
  });
  return idx;
}

const SEEDED_PEERS: LeaderboardEntry[] = [
  {
    id: 'peer-sora',
    name: 'Sora Kim',
    avatar: '🐉',
    xp: 640,
    beltIndex: 6,
    streak: 9,
    lessonsDone: 7,
    quizWins: 14,
    medals: { gold: 2, silver: 1, bronze: 0 },
    updatedAt: new Date().toISOString(),
    isPeer: true,
  },
  {
    id: 'peer-noor',
    name: 'Noor Al-Mansoor',
    avatar: '🦁',
    xp: 480,
    beltIndex: 4,
    streak: 7,
    lessonsDone: 5,
    quizWins: 11,
    medals: { gold: 1, silver: 2, bronze: 1 },
    updatedAt: new Date().toISOString(),
    isPeer: true,
  },
  {
    id: 'peer-leo',
    name: 'Leo Rivera',
    avatar: '🐯',
    xp: 330,
    beltIndex: 3,
    streak: 5,
    lessonsDone: 4,
    quizWins: 8,
    medals: { gold: 1, silver: 0, bronze: 2 },
    updatedAt: new Date().toISOString(),
    isPeer: true,
  },
  {
    id: 'peer-aya',
    name: 'Aya Malik',
    avatar: '🐼',
    xp: 215,
    beltIndex: 2,
    streak: 4,
    lessonsDone: 3,
    quizWins: 5,
    medals: { gold: 0, silver: 1, bronze: 1 },
    updatedAt: new Date().toISOString(),
    isPeer: true,
  },
  {
    id: 'peer-omar',
    name: 'Omar Hassan',
    avatar: '🦊',
    xp: 120,
    beltIndex: 1,
    streak: 3,
    lessonsDone: 2,
    quizWins: 3,
    medals: { gold: 0, silver: 0, bronze: 1 },
    updatedAt: new Date().toISOString(),
    isPeer: true,
  },
];

function loadDB(): DojoDB {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: DojoDB = { profiles: {}, appliedOps: {}, peers: SEEDED_PEERS };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      profiles: parsed.profiles || {},
      appliedOps: parsed.appliedOps || {},
      peers: Array.isArray(parsed.peers) && parsed.peers.length > 0 ? parsed.peers : SEEDED_PEERS,
    };
  } catch {
    return { profiles: {}, appliedOps: {}, peers: SEEDED_PEERS };
  }
}

function saveDB(db: DojoDB) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch {
    // Ignore disk write errors gracefully in read-only environments
  }
}

function buildLeaderboard(db: DojoDB): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [...db.peers];
  for (const [profileId, prog] of Object.entries(db.profiles)) {
    if (!prog) continue;
    const xp = Number(prog.xp || 0);
    entries.push({
      id: profileId,
      name: (prog.athleteName && String(prog.athleteName).trim()) || 'Champion Athlete',
      avatar: prog.avatar || '🐯',
      xp,
      beltIndex: getBeltIndex(xp),
      streak: Number(prog.streak || 0),
      lessonsDone: Array.isArray(prog.completedLessons) ? prog.completedLessons.length : 0,
      quizWins: Number(prog.quizWins || 0),
      medals: {
        gold: Number(prog.medals?.gold || 0),
        silver: Number(prog.medals?.silver || 0),
        bronze: Number(prog.medals?.bronze || 0),
      },
      updatedAt: prog.updatedAt || new Date().toISOString(),
      isPeer: false,
    });
  }
  entries.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    const aMedals = a.medals.gold * 3 + a.medals.silver * 2 + a.medals.bronze;
    const bMedals = b.medals.gold * 3 + b.medals.silver * 2 + b.medals.bronze;
    if (bMedals !== aMedals) return bMedals - aMedals;
    return b.streak - a.streak;
  });
  return entries;
}

function mergeProgress(existing: any, incoming: any): any {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const mergedLessons = Array.from(
    new Set([
      ...(Array.isArray(existing.completedLessons) ? existing.completedLessons : []),
      ...(Array.isArray(incoming.completedLessons) ? incoming.completedLessons : []),
    ])
  ).sort((a, b) => a - b);

  const mergedWatched = Array.from(
    new Set([
      ...(Array.isArray(existing.movieWatched) ? existing.movieWatched : []),
      ...(Array.isArray(incoming.movieWatched) ? incoming.movieWatched : []),
    ])
  );

  const existingTime = new Date(existing.updatedAt || 0).getTime();
  const incomingTime = new Date(incoming.updatedAt || 0).getTime();
  const newer = incomingTime >= existingTime ? incoming : existing;

  return {
    ...newer,
    xp: Math.max(Number(existing.xp || 0), Number(incoming.xp || 0)),
    streak: Math.max(Number(existing.streak || 0), Number(incoming.streak || 0)),
    quizWins: Math.max(Number(existing.quizWins || 0), Number(incoming.quizWins || 0)),
    bestReaction: Math.max(Number(existing.bestReaction || 0), Number(incoming.bestReaction || 0)),
    sessions: Math.max(Number(existing.sessions || 0), Number(incoming.sessions || 0)),
    completedLessons: mergedLessons,
    movieWatched: mergedWatched,
    lessonDates: { ...(existing.lessonDates || {}), ...(incoming.lessonDates || {}) },
    medals: {
      gold: Math.max(Number(existing.medals?.gold || 0), Number(incoming.medals?.gold || 0)),
      silver: Math.max(Number(existing.medals?.silver || 0), Number(incoming.medals?.silver || 0)),
      bronze: Math.max(Number(existing.medals?.bronze || 0), Number(incoming.medals?.bronze || 0)),
    },
    fightResults: (incoming.fightResults?.length || 0) >= (existing.fightResults?.length || 0)
      ? incoming.fightResults || []
      : existing.fightResults || [],
    updatedAt: new Date().toISOString(),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get('/api/progress/:profileId', (req, res) => {
    const db = loadDB();
    const { profileId } = req.params;
    const progress = db.profiles[profileId] || null;
    res.json({ progress, leaderboard: buildLeaderboard(db) });
  });

  app.put('/api/progress/:profileId', (req, res) => {
    const db = loadDB();
    const { profileId } = req.params;
    const incoming = req.body?.progress;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Invalid progress payload' });
      return;
    }
    const merged = req.body?.forceReplace
      ? { ...incoming, updatedAt: new Date().toISOString() }
      : mergeProgress(db.profiles[profileId], incoming);
    db.profiles[profileId] = merged;
    saveDB(db);
    res.json({ progress: merged, leaderboard: buildLeaderboard(db), syncedAt: new Date().toISOString() });
  });

  app.post('/api/sync', (req, res) => {
    const db = loadDB();
    const profileId: string = req.body?.profileId || 'default-athlete';
    const ops: SyncOp[] = Array.isArray(req.body?.ops) ? req.body.ops : [];
    const clientProgress = req.body?.progress;

    const alreadyApplied = new Set(db.appliedOps[profileId] || []);
    const newlyApplied: string[] = [];

    let current = db.profiles[profileId] || null;
    const hasResetOp = ops.some((op) => op.type === 'RESET' && !alreadyApplied.has(op.opId));

    if (hasResetOp && clientProgress) {
      current = { ...clientProgress, updatedAt: new Date().toISOString() };
      for (const op of ops) {
        if (!alreadyApplied.has(op.opId)) {
          alreadyApplied.add(op.opId);
          newlyApplied.push(op.opId);
        }
      }
    } else {
      for (const op of ops) {
        if (!op || !op.opId || alreadyApplied.has(op.opId)) continue;
        if (op.type === 'STATE_SNAPSHOT' && op.payload) {
          current = mergeProgress(current, op.payload);
        }
        alreadyApplied.add(op.opId);
        newlyApplied.push(op.opId);
      }
      if (clientProgress) {
        current = mergeProgress(current, clientProgress);
      }
    }

    if (current) {
      db.profiles[profileId] = current;
    }
    db.appliedOps[profileId] = Array.from(alreadyApplied).slice(-200);
    saveDB(db);

    res.json({
      progress: current,
      appliedOpIds: newlyApplied,
      leaderboard: buildLeaderboard(db),
      syncedAt: new Date().toISOString(),
    });
  });

  app.get('/api/leaderboard', (_req, res) => {
    const db = loadDB();
    res.json({ leaderboard: buildLeaderboard(db), updatedAt: new Date().toISOString() });
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Taekwondo Kids Adventure server listening on http://localhost:${PORT}`);
  });
}

startServer();
