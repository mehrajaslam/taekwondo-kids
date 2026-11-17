import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, CloudOff, RefreshCw, Sparkles } from 'lucide-react';
import {
  AVATARS,
  BELT_FRIENDS,
  createDefaultProgress,
  DEFAULT_NAMES,
  GUIDE_STEPS,
  KIKI_CHEERS,
  KIKI_TIPS,
  pick,
  T,
  THRESHOLDS,
} from './data/taekwondoData';
import { Lang, LeaderboardEntry, Progress } from './types/taekwondo';
import {
  ALL_OFFLINE_AUDIO_KEYS,
  getCachedAudioCount,
  precacheAllExerciseAudio,
  speakInstruction,
  stopAllAudio,
} from './lib/audioEngine';
import {
  enqueueSyncOp,
  fetchLeaderboardFromServer,
  getCachedLeaderboard,
  getLastSyncedAt,
  getOrCreateProfileId,
  getSyncQueue,
  loadLocalProgress,
  saveLocalProgress,
  syncWithServer,
  useOnlineStatus,
} from './lib/offlineSync';
import { PWAInstallButton } from './components/PWAInstallButton';
import { LearnSection } from './components/LearnSection';
import { GamesSection } from './components/GamesSection';
import { ArenaSection } from './components/ArenaSection';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { ProgressAndSettings } from './components/ProgressAndSettings';

type MainTab = 'learn' | 'play' | 'arena' | 'leaderboard' | 'progress' | 'customize';

export default function App() {
  const [initialProfileId] = useState<string>(() => getOrCreateProfileId());
  const [progress, setProgressRaw] = useState<Progress>(() => createDefaultProgress(initialProfileId));
  const [hydrated, setHydrated] = useState(false);

  const [tab, setTab] = useState<MainTab>('learn');
  const [playInitialGame, setPlayInitialGame] = useState<'quiz' | 'memory' | 'matching' | 'reaction' | 'dan'>('quiz');
  const [selected, setSelected] = useState(0);
  const [athleteInput, setAthleteInput] = useState('');

  const [toast, setToast] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const [showParentNote, setShowParentNote] = useState(false);
  const [outOfLives, setOutOfLives] = useState(false);
  const [rankUp, setRankUp] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const [speaking, setSpeaking] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [mascotAnim, setMascotAnim] = useState<'idle' | 'jump' | 'sad' | 'wiggle'>('idle');
  const [mascotText, setMascotText] = useState('');
  const [showKikiHelp, setShowKikiHelp] = useState(false);

  // Offline & Audio Sync State
  const isOnline = useOnlineStatus();
  const prevOnlineRef = useRef(isOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => getLastSyncedAt());
  const [isSyncing, setIsSyncing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => getCachedLeaderboard());
  const [cachedAudioCount, setCachedAudioCount] = useState(0);
  const [audioCaching, setAudioCaching] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevUnlockedRef = useRef(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgressRef = useRef<Progress>(progress);
  latestProgressRef.current = progress;

  // Functional wrapper ensuring updatedAt always advances on user actions
  const setProgress: React.Dispatch<React.SetStateAction<Progress>> = useCallback((updater) => {
    setProgressRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return {
        ...next,
        profileId: next.profileId || prev.profileId || initialProfileId,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [initialProfileId]);

  const lang: Lang = progress.language || 'en';
  const rtl = lang !== 'en';

  const t = useCallback(
    (k: string) => (T[lang] && T[lang][k]) || T.en[k] || k,
    [lang]
  );

  const tr = useCallback(
    (en: string, ur: string, ar: string) => (lang === 'ur' ? ur : lang === 'ar' ? ar : en),
    [lang]
  );

  const unlockedIndex = useMemo(() => {
    let idx = 0;
    THRESHOLDS.forEach((v, i) => {
      if (progress.xp >= v) idx = i;
    });
    return idx;
  }, [progress.xp]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? '' : curr));
    }, 3200);
  }, []);

  // Hydrate offline storage & precache audio cues on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const local = await loadLocalProgress();
      const queue = await getSyncQueue();
      if (!active) return;

      const base = local
        ? { ...createDefaultProgress(initialProfileId), ...local, profileId: local.profileId || initialProfileId }
        : createDefaultProgress(initialProfileId);

      setProgressRaw(base);
      setAthleteInput(base.athleteName || '');
      setPendingCount(queue.length);

      let uIdx = 0;
      THRESHOLDS.forEach((v, i) => {
        if (base.xp >= v) uIdx = i;
      });
      prevUnlockedRef.current = uIdx;
      setSelected(uIdx);
      setHydrated(true);

      // Load server state & leaderboard when online
      if (navigator.onLine) {
        if (queue.length > 0 || base.xp > 0 || base.completedLessons.length > 0) {
          const res = await syncWithServer(base.profileId, base);
          if (active && res.ok) {
            if (res.progress) {
              setProgressRaw(res.progress);
              setAthleteInput(res.progress.athleteName || '');
            }
            if (res.leaderboard) setLeaderboard(res.leaderboard);
            if (res.syncedAt) setLastSyncedAt(res.syncedAt);
            setPendingCount(res.remainingQueueCount);
          }
        } else {
          try {
            const resp = await fetch(`/api/progress/${encodeURIComponent(base.profileId)}`);
            if (resp.ok) {
              const data = await resp.json();
              if (active && data.progress && (data.progress.xp > base.xp || data.progress.completedLessons?.length > 0)) {
                setProgressRaw(data.progress);
                await saveLocalProgress(data.progress);
              }
            }
          } catch {
            // Stay with local copy
          }
          const lb = await fetchLeaderboardFromServer();
          if (active && lb) setLeaderboard(lb);
        }
      }

      // Check & precache offline exercise audio cues
      const count = await getCachedAudioCount();
      if (active) setCachedAudioCount(count);
      if (count < ALL_OFFLINE_AUDIO_KEYS.length) {
        setAudioCaching(true);
        const totalCached = await precacheAllExerciseAudio((done) => {
          if (active) setCachedAudioCount(done);
        });
        if (active) {
          setCachedAudioCount(totalCached);
          setAudioCaching(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [initialProfileId]);

  // Apply theme, RTL direction, and high-contrast attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', progress.theme);
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.lang = lang;
  }, [progress.theme, rtl, lang]);

  // Set default mascot greeting when language switches
  useEffect(() => {
    setMascotText(t('canDo'));
  }, [lang, t]);

  // Detect rank up
  useEffect(() => {
    if (!hydrated) return;
    if (unlockedIndex > prevUnlockedRef.current) {
      prevUnlockedRef.current = unlockedIndex;
      setRankUp(unlockedIndex);
      setSelected(unlockedIndex);
      setMascotAnim('jump');
      setTimeout(() => setMascotAnim('idle'), 900);
    }
  }, [unlockedIndex, hydrated]);

  // Sync progress to IndexedDB/localStorage + enqueue sync op + debounced server sync
  const handleSyncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setSaveState('offline');
      showToast(tr('You are offline — progress safely queued!', 'آپ آف لائن ہیں — ترقی محفوظ کر لی گئی!', 'أنت غير متصل — تم حفظ التقدم في قائمة المزامنة!'));
      return;
    }
    setIsSyncing(true);
    setSaveState('saving');
    const current = latestProgressRef.current;
    const res = await syncWithServer(current.profileId, current);
    setIsSyncing(false);
    if (res.ok) {
      setPendingCount(res.remainingQueueCount);
      if (res.leaderboard) setLeaderboard(res.leaderboard);
      if (res.syncedAt) setLastSyncedAt(res.syncedAt);
      if (res.progress && res.progress.xp > current.xp) {
        setProgressRaw(res.progress);
      }
      setSaveState('saved');
      showToast(tr('Synced with Dojo Leaderboard!', 'ڈوجو لیڈر بورڈ کے ساتھ سنک ہو گیا!', 'تمت المزامنة مع لوحة متصدري الدوجو!'));
    } else {
      setSaveState('offline');
    }
  }, [showToast, tr]);

  // Persist every progress change offline first, then queue & sync
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      await saveLocalProgress(progress);
      const q = await enqueueSyncOp({
        opId: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'STATE_SNAPSHOT',
        timestamp: progress.updatedAt || new Date().toISOString(),
        payload: progress,
      });
      if (!cancelled) {
        setPendingCount(q.length);
        setSaveState(isOnline ? 'saving' : 'offline');
      }
    })();

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    if (isOnline) {
      syncTimerRef.current = setTimeout(async () => {
        const res = await syncWithServer(progress.profileId, progress);
        if (!cancelled && res.ok) {
          setPendingCount(res.remainingQueueCount);
          if (res.leaderboard) setLeaderboard(res.leaderboard);
          if (res.syncedAt) setLastSyncedAt(res.syncedAt);
          setSaveState('saved');
        } else if (!cancelled) {
          setSaveState('offline');
        }
      }, 900);
    }

    return () => {
      cancelled = true;
    };
  }, [progress, hydrated, isOnline]);

  // Auto-sync when connectivity returns
  useEffect(() => {
    if (hydrated && !prevOnlineRef.current && isOnline) {
      void handleSyncNow();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, hydrated, handleSyncNow]);

  // Sound FX (Web Audio API)
  const beep = useCallback(
    (freq = 520, dur = 0.12, type: OscillatorType = 'triangle') => {
      if (!progress.sound) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = audioCtxRef.current || new AudioCtx();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') void ctx.resume();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + dur);
      } catch {
        // AudioContext blocked or unavailable
      }
    },
    [progress.sound]
  );

  // Voice instruction wrappers wired to offline audioEngine
  const speak = useCallback(
    (
      text: string,
      exerciseId?: string,
      category: 'lesson' | 'move' | 'poomsae' | 'coach' | 'kiki' | 'quiz' = 'move',
      pitch = 1
    ) => {
      speakInstruction(text, {
        lang,
        rate: progress.speechRate || 1,
        pitch,
        exerciseId,
        category,
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
    },
    [lang, progress.speechRate]
  );

  const speakKid = useCallback(
    (text: string, exerciseId?: string) => speak(text, exerciseId, 'kiki', 1.2),
    [speak]
  );

  const speakCoach = useCallback(
    (text: string, exerciseId?: string) => speak(text, exerciseId, 'coach', 0.96),
    [speak]
  );

  const stopSpeak = useCallback(() => {
    stopAllAudio();
    setSpeaking(false);
  }, []);

  const happyMascot = useCallback(() => {
    setMascotAnim('jump');
    setTimeout(() => setMascotAnim('idle'), 750);
  }, []);

  const sadMascot = useCallback(() => {
    setMascotAnim('sad');
    setTimeout(() => setMascotAnim('idle'), 550);
  }, []);

  const kidCheer = useCallback(() => {
    beep(680, 0.08, 'sine');
    setTimeout(() => beep(880, 0.11, 'sine'), 80);
  }, [beep]);

  const addXp = useCallback(
    (n: number, msg?: string) => {
      setProgress((p) => ({
        ...p,
        xp: Math.max(0, p.xp + n),
        streak: p.streak + 1,
        sessions: p.sessions + 1,
      }));
      if (n > 0) happyMascot();
      if (msg) {
        setMascotText(msg);
        showToast(msg);
      }
    },
    [setProgress, happyMascot, showToast]
  );

  const loseLife = useCallback(() => {
    sadMascot();
    setProgress((p) => {
      const next = Math.max(0, p.lives - 1);
      if (next === 0) setOutOfLives(true);
      return { ...p, lives: next, streak: 0 };
    });
  }, [sadMascot, setProgress]);

  const handleCacheAllAudio = useCallback(async () => {
    setAudioCaching(true);
    const done = await precacheAllExerciseAudio((count) => setCachedAudioCount(count));
    setCachedAudioCount(done);
    setAudioCaching(false);
    showToast(t('allAudioReady'));
  }, [showToast, t]);

  const handleResetAll = useCallback(async () => {
    stopSpeak();
    const fresh = createDefaultProgress(progress.profileId);
    setProgressRaw(fresh);
    setAthleteInput('');
    setSelected(0);
    prevUnlockedRef.current = 0;
    await saveLocalProgress(fresh);
    const q = await enqueueSyncOp({
      opId: `reset-${Date.now()}`,
      type: 'RESET',
      timestamp: fresh.updatedAt,
      payload: fresh,
    });
    setPendingCount(q.length);
    if (navigator.onLine) {
      const res = await syncWithServer(fresh.profileId, fresh);
      if (res.ok) {
        setPendingCount(res.remainingQueueCount);
        if (res.leaderboard) setLeaderboard(res.leaderboard);
      }
    }
    showToast(t('resetMsg'));
  }, [progress.profileId, showToast, stopSpeak, t]);

  const questDone = progress.completedLessons.length >= 1 && progress.quizWins >= 1;
  const nextRankThreshold = THRESHOLDS[unlockedIndex + 1];
  const currentThreshold = THRESHOLDS[unlockedIndex];
  const rankProgressPct = nextRankThreshold
    ? Math.min(100, Math.round(((progress.xp - currentThreshold) / (nextRankThreshold - currentThreshold)) * 100))
    : 100;

  const displayBeltName =
    lang === 'en'
      ? progress.settings.beltNames[unlockedIndex] || pick(DEFAULT_NAMES[unlockedIndex], lang)
      : pick(DEFAULT_NAMES[unlockedIndex], lang);

  const navItems: { id: MainTab; emoji: string; label: string }[] = [
    { id: 'learn', emoji: '📚', label: t('learn') },
    { id: 'play', emoji: '🎮', label: t('playNav') },
    { id: 'arena', emoji: '⚔️', label: t('arenaNav') },
    { id: 'leaderboard', emoji: '🏆', label: t('leaderboard') },
    { id: 'progress', emoji: '📊', label: t('progressNav') },
    { id: 'customize', emoji: '⚙️', label: t('customize') },
  ];

  const langToggleBtn = (l: Lang, flag: string, label: string) => (
    <button
      key={l}
      onClick={() => {
        stopSpeak();
        setProgress((p) => ({ ...p, language: l }));
        beep(600, 0.06);
      }}
      aria-pressed={lang === l}
      className="rounded-full px-3 py-1.5 text-xs sm:text-sm font-black border-2 transition whitespace-nowrap shrink-0 min-h-[44px]"
      style={{
        background: lang === l ? '#FACC15' : 'var(--surface)',
        color: lang === l ? '#0F172A' : 'var(--text)',
        borderColor: 'var(--line)',
      }}
    >
      {flag} {label}
    </button>
  );

  return (
    <div
      className={`min-h-screen pb-24 transition-colors ${highContrast ? 'high-contrast' : ''} ${
        lang === 'ur' ? 'lang-ur' : lang === 'ar' ? 'lang-ar' : ''
      }`}
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b-[3px] border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur px-3 py-2.5 shadow-sm">
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-2xl border-2 border-slate-900 shadow-sm">
              🥋
            </span>
            <div>
              <p className="text-base sm:text-lg font-black leading-none">
                {t('titleA')} <span className="text-blue-700 dark:text-yellow-300">{t('titleB')}</span>
              </p>
              <p className="text-xs font-bold text-[var(--muted)] mt-0.5">{t('tag')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {langToggleBtn('en', '🇬🇧', 'EN')}
            {langToggleBtn('ur', '🇵🇰', 'اردو')}
            {langToggleBtn('ar', '🇸🇦', 'العربية')}

            <button
              onClick={() => setProgress((p) => ({ ...p, sound: !p.sound }))}
              className="rounded-full border-2 border-[var(--line)] bg-[var(--surface2)] px-3 py-1.5 text-xs sm:text-sm font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[44px]"
              aria-label={progress.sound ? t('soundOn') : t('soundOff')}
            >
              {progress.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{progress.sound ? t('soundOn') : t('soundOff')}</span>
            </button>

            <button
              onClick={() => setProgress((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
              className="rounded-full border-2 border-[var(--line)] bg-[var(--surface2)] px-3 py-1.5 text-xs sm:text-sm font-black whitespace-nowrap shrink-0 min-h-[44px]"
            >
              {progress.theme === 'dark' ? '☀️' : '🌙'} <span className="hidden md:inline">{progress.theme === 'dark' ? t('light') : t('dark')}</span>
            </button>

            <button
              onClick={() => setHighContrast((h) => !h)}
              aria-pressed={highContrast}
              className="rounded-full border-2 border-[var(--line)] bg-[var(--surface2)] px-3 py-1.5 text-xs font-black whitespace-nowrap shrink-0 min-h-[44px]"
              title={tr('High Contrast', 'ہائی کنٹراسٹ', 'تباين عالٍ')}
            >
              ◐
            </button>

            <PWAInstallButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1040px] px-3 pt-4 sm:px-5">
        {/* Offline / Sync Queue Status Banner (shown only when offline or queued updates exist) */}
        {(!isOnline || pendingCount > 0) && (
          <div
            role="status"
            className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-[3px] border-slate-900 bg-amber-100 px-4 py-2.5 text-slate-900 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm font-black">
              {!isOnline ? <CloudOff className="w-4 h-4 shrink-0" /> : <RefreshCw className="w-4 h-4 shrink-0" />}
              <span>
                {!isOnline
                  ? tr(
                      `Offline Training Mode — Voice & audio lessons ready (${cachedAudioCount}/${ALL_OFFLINE_AUDIO_KEYS.length}). ${pendingCount} update(s) queued.`,
                      `آف لائن موڈ — آڈیو اسباق تیار ہیں (${cachedAudioCount}/${ALL_OFFLINE_AUDIO_KEYS.length})۔ ${pendingCount} اپڈیٹس سنک کے لیے محفوظ ہیں۔`,
                      `وضع عدم الاتصال — الدروس الصوتية جاهزة (${cachedAudioCount}/${ALL_OFFLINE_AUDIO_KEYS.length}). ${pendingCount} تحديثات بانتظار المزامنة.`
                    )
                  : tr(
                      `${pendingCount} offline update(s) ready to sync with the Dojo Leaderboard.`,
                      `${pendingCount} آف لائن اپڈیٹس ڈوجو لیڈر بورڈ کے ساتھ سنک کے لیے تیار ہیں۔`,
                      `${pendingCount} تحديثات جاهزة للمزامنة مع لوحة المتصدرين.`
                    )}
              </span>
            </div>
            {isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="rounded-full bg-blue-700 px-3 py-1.5 text-xs font-black text-white border-2 border-slate-900 min-h-[38px]"
              >
                {isSyncing ? '...' : t('syncNow')}
              </button>
            )}
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div
            role="status"
            className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-full border-[3px] border-slate-900 bg-yellow-300 px-5 py-2.5 text-sm font-black text-slate-900 shadow-xl pop"
          >
            ✨ {toast}
          </div>
        )}

        {/* Hero Banner */}
        <section className="card relative overflow-hidden p-4 sm:p-6">
          <div className="cloud left-[6%] top-3 h-7 w-24 hidden sm:block" />
          <div className="cloud right-[8%] top-5 h-6 w-20 hidden sm:block" />

          <div className="relative z-10 grid items-center gap-4 md:grid-cols-[1.3fr_.7fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-slate-900 bg-yellow-300 px-3 py-1 text-xs font-black text-slate-900">
                  {pick(BELT_FRIENDS[unlockedIndex].animal ? [BELT_FRIENDS[unlockedIndex].fun[0], BELT_FRIENDS[unlockedIndex].fun[1], BELT_FRIENDS[unlockedIndex].fun[2]] : ['Hero', 'ہیرو', 'بطل'], lang)}
                </span>
                <span className="rounded-full border-2 border-slate-900 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950">
                  🔊 {tr(`Offline Voice: ${cachedAudioCount}/${ALL_OFFLINE_AUDIO_KEYS.length}`, `آف لائن آواز: ${cachedAudioCount}/${ALL_OFFLINE_AUDIO_KEYS.length}`, `الصوت دون اتصال: ${cachedAudioCount}/${ALL_OFFLINE_AUDIO_KEYS.length}`)}
                </span>
              </div>

              <h1 className="mt-2 text-[clamp(1.6rem,4.5vw,2.5rem)] font-black leading-tight">
                {progress.athleteName
                  ? tr(`Go, ${progress.athleteName}!`, `شاباش، ${progress.athleteName}!`, `انطلق يا ${progress.athleteName}!`)
                  : `${t('titleA')} ${t('titleB')}`}
              </h1>
              <p className="mt-1 text-sm sm:text-base font-bold text-[var(--muted)]">{t('subtitle')}</p>

              {/* Fighter Avatar Picker */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">{t('choose')}</span>
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => {
                      setProgress((p) => ({ ...p, avatar: av }));
                      beep(640, 0.06);
                    }}
                    className="grid h-11 w-11 place-items-center rounded-full border-[3px] bg-white text-xl transition hover:scale-105"
                    style={{
                      borderColor: progress.avatar === av ? '#1D4ED8' : 'var(--line)',
                      boxShadow: progress.avatar === av ? '0 0 0 3px #FACC15' : undefined,
                    }}
                    aria-label={`${t('choose')} ${av}`}
                    aria-pressed={progress.avatar === av}
                  >
                    {av}
                  </button>
                ))}
              </div>

              {/* Action Quick Buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setShowGuide(true);
                    setGuideStep(0);
                    speakKid(pick(GUIDE_STEPS[0].text, lang), 'kiki-welcome');
                  }}
                  className="big-btn yellow !py-2 !px-4 text-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('coachKiki')}</span>
                </button>
                <button
                  onClick={() => {
                    const msg = pick(KIKI_CHEERS[Math.floor(Math.random() * KIKI_CHEERS.length)], lang);
                    setMascotText(msg);
                    happyMascot();
                    kidCheer();
                    speakKid(msg, 'kiki-welcome');
                  }}
                  className="ghost !py-2 !px-4 text-sm"
                >
                  📣 {t('cheer')}
                </button>
                <button
                  onClick={() => setShowParentNote((s) => !s)}
                  className="ghost !py-2 !px-4 text-sm"
                >
                  👨‍👩‍👧 {t('parentNoteBtn')}
                </button>
              </div>
            </div>

            {/* Coach Kiki Mascot Bubble */}
            <div className="rounded-3xl border-[3px] border-[var(--line)] bg-[var(--surface2)] p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div
                  className={`text-6xl select-none ${
                    mascotAnim === 'jump'
                      ? 'mascot-jump'
                      : mascotAnim === 'sad'
                      ? 'mascot-sad'
                      : 'mascot-idle'
                  }`}
                >
                  {progress.avatar}
                </div>
                <div className="text-4xl">🥋</div>
              </div>
              <p className="mt-2 rounded-2xl border-2 border-slate-900 bg-yellow-100 px-3 py-2 text-sm font-black text-slate-900">
                “{mascotText || t('canDo')}”
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2 text-xs font-black">
                <span>
                  {displayBeltName} ({rankProgressPct}%)
                </span>
                <span className="tabular-nums">
                  {nextRankThreshold ? `${progress.xp}/${nextRankThreshold} XP` : `${progress.xp} XP`}
                </span>
              </div>
              <div className="progress-track mt-1 !h-3.5">
                <div className="progress-fill" style={{ width: `${rankProgressPct}%` }} />
              </div>
            </div>
          </div>

          {/* Parent / Teacher Note Collapsible */}
          {showParentNote && (
            <div className="mt-4 rounded-2xl border-[3px] border-slate-900 bg-sky-50 p-4 text-sm font-bold text-slate-900">
              {t('parentNote')}
            </div>
          )}
        </section>

        {/* 4 Key Stats + Daily Quest */}
        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-3.5 text-center">
            <p className="text-xs font-black text-[var(--muted)]">⭐ {t('totalXP')}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black tabular-nums">{progress.xp}</p>
          </div>
          <div className="card p-3.5 text-center">
            <p className="text-xs font-black text-[var(--muted)]">🥋 {t('rank')}</p>
            <p className="mt-1 text-lg sm:text-xl font-black truncate">{displayBeltName}</p>
          </div>
          <div className="card p-3.5 text-center">
            <p className="text-xs font-black text-[var(--muted)]">❤️ {t('lives')}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {Array.from({ length: 3 }, (_, i) => (i < progress.lives ? '❤️' : '🤍')).join('')}
            </p>
          </div>
          <div className="card p-3.5 text-center">
            <p className="text-xs font-black text-[var(--muted)]">🔥 {t('streak')}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black tabular-nums">{progress.streak}</p>
          </div>
        </section>

        {/* Today's Fun Challenge Bar */}
        <section className="card mt-3 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-yellow-100 to-amber-50 p-3.5 text-slate-900">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-sm font-black">{t('quest')}</p>
              <p className="text-xs font-bold text-slate-700">{questDone ? t('questDone') : t('questDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {progress.questClaimed ? (
              <span className="rounded-full border-2 border-slate-900 bg-emerald-200 px-4 py-1.5 text-xs font-black text-emerald-950">
                ✅ {t('questDoneBtn')}
              </span>
            ) : (
              <button
                disabled={!questDone}
                onClick={() => {
                  setProgress((p) => ({ ...p, questClaimed: true }));
                  addXp(100, t('questDone'));
                  kidCheer();
                }}
                className="big-btn yellow !py-2 !px-4 text-xs sm:text-sm"
              >
                {questDone ? t('claim') : t('keep')}
              </button>
            )}
          </div>
        </section>

        {/* Simple Kid-Friendly Primary Navigation */}
        <nav
          aria-label="Main sections"
          className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                beep(540, 0.05);
              }}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`tab-btn flex items-center gap-1.5 ${tab === item.id ? 'active' : ''}`}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Active Section */}
        <section className="mt-3">
          {tab === 'learn' && (
            <LearnSection
              progress={progress}
              setProgress={setProgress}
              selected={selected}
              setSelected={setSelected}
              unlockedIndex={unlockedIndex}
              lang={lang}
              speaking={speaking}
              onSpeak={(txt, exId, cat) => speak(txt, exId, cat || 'lesson')}
              onSpeakKid={speakKid}
              onSpeakCoach={speakCoach}
              onStopSpeak={stopSpeak}
              onBeep={beep}
              onAddXp={addXp}
              onCheer={(m) => {
                setMascotText(m);
                happyMascot();
              }}
              onJumpToPlay={(g) => {
                setPlayInitialGame(g);
                setTab('play');
              }}
              t={t}
              tr={tr}
            />
          )}

          {tab === 'play' && (
            <GamesSection
              initialGame={playInitialGame}
              progress={progress}
              setProgress={setProgress}
              selected={selected}
              unlockedIndex={unlockedIndex}
              lang={lang}
              speaking={speaking}
              mascotText={mascotText}
              onSpeak={(txt, exId, cat) => speak(txt, exId, cat || 'quiz')}
              onStopSpeak={stopSpeak}
              onBeep={beep}
              onHappy={happyMascot}
              onAddXp={addXp}
              onLoseLife={loseLife}
              onCheer={(m) => {
                setMascotText(m);
                happyMascot();
              }}
              onEncourage={(m) => setMascotText(m)}
              onKidCheer={kidCheer}
              t={t}
            />
          )}

          {tab === 'arena' && (
            <ArenaSection
              progress={progress}
              setProgress={setProgress}
              lang={lang}
              athleteInput={athleteInput}
              setAthleteInput={setAthleteInput}
              onSpeakCoach={(txt) => speakCoach(txt, 'coachtv-track-0')}
              onStopSpeak={stopSpeak}
              onBeep={beep}
              onHappy={happyMascot}
              onAddXp={addXp}
              onCheer={(m) => {
                setMascotText(m);
                happyMascot();
              }}
              onGoToProgress={() => setTab('progress')}
              t={t}
              tr={tr}
            />
          )}

          {tab === 'leaderboard' && (
            <LeaderboardPanel
              entries={leaderboard}
              progress={progress}
              lang={lang}
              isOnline={isOnline}
              pendingCount={pendingCount}
              isSyncing={isSyncing}
              onSyncNow={handleSyncNow}
              onSpeak={(txt) => speakKid(txt, 'kiki-welcome')}
              tr={tr}
            />
          )}

          {(tab === 'progress' || tab === 'customize') && (
            <ProgressAndSettings
              mode={tab}
              progress={progress}
              setProgress={setProgress}
              unlockedIndex={unlockedIndex}
              lang={lang}
              athleteInput={athleteInput}
              setAthleteInput={setAthleteInput}
              isOnline={isOnline}
              pendingCount={pendingCount}
              lastSyncedAt={lastSyncedAt}
              isSyncing={isSyncing}
              cachedAudioCount={cachedAudioCount}
              totalAudioCount={ALL_OFFLINE_AUDIO_KEYS.length}
              audioCaching={audioCaching}
              onSyncNow={handleSyncNow}
              onCacheAllAudio={handleCacheAllAudio}
              onResetAll={handleResetAll}
              onToast={showToast}
              onBeep={beep}
              onStopSpeak={stopSpeak}
              t={t}
              tr={tr}
            />
          )}
        </section>

        {/* Footer */}
        <footer className="mt-8 pb-6 text-center text-xs font-bold text-[var(--muted)]">
          <p>{t('footer')}</p>
          <p className="mt-1">
            {saveState === 'saving'
              ? t('saving')
              : saveState === 'offline'
              ? t('saveUnavailable')
              : saveState === 'saved'
              ? `✅ ${t('saved')}`
              : ''}
          </p>
        </footer>
      </main>

      {/* Floating Coach Kiki Ask Helper */}
      <button
        onClick={() => {
          const tip = pick(KIKI_TIPS[tab] || KIKI_TIPS.learn, lang);
          setShowKikiHelp((s) => !s);
          speakKid(tip, 'kiki-welcome');
        }}
        className="kiki-fab flex items-center gap-2"
        aria-label={t('askKiki')}
      >
        <span>🎤</span>
        <span>{t('askKiki')}</span>
      </button>

      {showKikiHelp && (
        <div className="fixed bottom-20 right-4 z-50 w-72 rounded-3xl border-[3px] border-slate-900 bg-yellow-100 p-4 text-slate-900 shadow-2xl pop">
          <div className="flex items-center justify-between">
            <p className="font-black">🎤 Coach Kiki</p>
            <button onClick={() => setShowKikiHelp(false)} className="text-sm font-black px-2">
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm font-bold leading-relaxed">{pick(KIKI_TIPS[tab] || KIKI_TIPS.learn, lang)}</p>
          <button
            onClick={() => speakKid(pick(KIKI_TIPS[tab] || KIKI_TIPS.learn, lang), 'kiki-welcome')}
            className="big-btn mt-3 w-full !py-2 text-xs"
          >
            🔊 {t('hearKiki')}
          </button>
        </div>
      )}

      {/* Out of Lives Modal */}
      {outOfLives && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-label={t('outLives')}>
          <div className="card max-w-md p-6 text-center pop">
            <div className="text-5xl">💛</div>
            <h2 className="mt-2 text-2xl font-black">{t('outLives')}</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  setProgress((p) => ({ ...p, lives: 3 }));
                  setOutOfLives(false);
                  kidCheer();
                }}
                className="big-btn yellow"
              >
                ❤️ {t('restore')}
              </button>
              <button onClick={() => setOutOfLives(false)} className="ghost">
                {t('dismiss')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rank Up Celebration Modal */}
      {rankUp !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-label={t('rankUp')}>
          <div className="card max-w-md p-6 text-center pop">
            <div className="text-6xl">🎉</div>
            <h2 className="mt-2 text-3xl font-black text-blue-700 dark:text-yellow-300">{t('rankUp')}</h2>
            <p className="mt-2 text-xl font-black">
              {t('now')} {lang === 'en' ? progress.settings.beltNames[rankUp] || pick(DEFAULT_NAMES[rankUp], lang) : pick(DEFAULT_NAMES[rankUp], lang)}
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--muted)]">
              {BELT_FRIENDS[rankUp]?.animal} {pick(BELT_FRIENDS[rankUp]?.name || ['Champion', 'چیمپئن', 'بطل'], lang)}
            </p>
            <button onClick={() => setRankUp(null)} className="big-btn yellow mt-5 w-full">
              {t('keepGoing')}
            </button>
          </div>
        </div>
      )}

      {/* Coach Kiki Step-by-Step Interactive Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-label={t('guideTitle')}>
          <div className="card w-full max-w-md p-6 text-center pop">
            <div className="text-6xl kiki-bounce">{GUIDE_STEPS[guideStep].emoji}</div>
            <h2 className="mt-3 text-2xl font-black">{pick(GUIDE_STEPS[guideStep].title, lang)}</h2>
            <p className="mt-2 text-base font-bold leading-relaxed text-[var(--muted)]">
              {pick(GUIDE_STEPS[guideStep].text, lang)}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => speakKid(pick(GUIDE_STEPS[guideStep].text, lang), 'kiki-welcome')}
                className="ghost !py-2 !px-4 text-sm"
              >
                🔊 {t('listen')}
              </button>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                disabled={guideStep === 0}
                onClick={() => {
                  const next = guideStep - 1;
                  setGuideStep(next);
                  speakKid(pick(GUIDE_STEPS[next].text, lang), 'kiki-welcome');
                }}
                className="ghost"
              >
                {t('prevStep')}
              </button>
              <span className="text-xs font-black tabular-nums">
                {guideStep + 1} / {GUIDE_STEPS.length}
              </span>
              {guideStep < GUIDE_STEPS.length - 1 ? (
                <button
                  onClick={() => {
                    const next = guideStep + 1;
                    setGuideStep(next);
                    speakKid(pick(GUIDE_STEPS[next].text, lang), 'kiki-welcome');
                  }}
                  className="big-btn"
                >
                  {t('nextStep')}
                </button>
              ) : (
                <button
                  onClick={() => {
                    stopSpeak();
                    setShowGuide(false);
                  }}
                  className="big-btn yellow"
                >
                  {t('startTraining')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
