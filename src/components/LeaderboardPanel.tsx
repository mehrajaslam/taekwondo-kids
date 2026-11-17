import React, { useMemo, useState } from 'react';
import { RefreshCw, Trophy, Flame, Award, Volume2 } from 'lucide-react';
import { BELT_COLORS, DEFAULT_NAMES, pick, THRESHOLDS } from '../data/taekwondoData';
import { Lang, LeaderboardEntry, Progress, Tri } from '../types/taekwondo';
import { BeltVisual } from './BeltVisual';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  progress: Progress;
  lang: Lang;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
  onSpeak: (text: string) => void;
  tr: (en: string, ur: string, ar: string) => string;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  entries,
  progress,
  lang,
  isOnline,
  pendingCount,
  isSyncing,
  onSyncNow,
  onSpeak,
  tr,
}) => {
  const [sortBy, setSortBy] = useState<'xp' | 'medals' | 'streak'>('xp');
  const [filter, setFilter] = useState<'all' | 'top5'>('all');

  const mergedEntries = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    for (const e of entries) {
      map.set(e.id, e);
    }
    let myBeltIdx = 0;
    THRESHOLDS.forEach((th, idx) => {
      if (progress.xp >= th) myBeltIdx = idx;
    });
    const myEntry: LeaderboardEntry = {
      id: progress.profileId,
      name: (progress.athleteName && progress.athleteName.trim()) || tr('You (Champion)', 'آپ (چیمپئن)', 'أنت (البطل)'),
      avatar: progress.avatar || '🐯',
      xp: progress.xp,
      beltIndex: myBeltIdx,
      streak: progress.streak,
      lessonsDone: progress.completedLessons.length,
      quizWins: progress.quizWins,
      medals: progress.medals,
      updatedAt: progress.updatedAt,
      isPeer: false,
    };
    map.set(progress.profileId, myEntry);

    const list = Array.from(map.values()).sort((a, b) => {
      if (sortBy === 'medals') {
        const am = a.medals.gold * 3 + a.medals.silver * 2 + a.medals.bronze;
        const bm = b.medals.gold * 3 + b.medals.silver * 2 + b.medals.bronze;
        if (bm !== am) return bm - am;
      }
      if (sortBy === 'streak') {
        if (b.streak !== a.streak) return b.streak - a.streak;
      }
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.streak - a.streak;
    });
    return list;
  }, [entries, progress, sortBy, tr]);

  const myRankIndex = mergedEntries.findIndex((e) => e.id === progress.profileId);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : 1;
  const nextAbove = myRankIndex > 0 ? mergedEntries[myRankIndex - 1] : null;
  const xpToPass = nextAbove ? Math.max(1, nextAbove.xp - progress.xp + 1) : 0;
  const shown = filter === 'top5' ? mergedEntries.slice(0, 5) : mergedEntries;
  const top3 = mergedEntries.slice(0, 3);

  const summarySpeech = nextAbove
    ? pick(
        [
          `You are rank ${myRank} on the Dojo Leaderboard with ${progress.xp} XP! Earn ${xpToPass} more XP to pass ${nextAbove.name}!`,
          `آپ ڈوجو لیڈر بورڈ پر ${myRank} نمبر پر ہیں، ${progress.xp} ایکس پی کے ساتھ! ${nextAbove.name} سے آگے جانے کے لیے ${xpToPass} مزید ایکس پی کمائیں!`,
          `أنت في المركز ${myRank} على لوحة المتصدرين برصيد ${progress.xp} نقطة! اكسب ${xpToPass} نقطة إضافية لتتقدم على ${nextAbove.name}!`,
        ] as Tri,
        lang
      )
    : pick(
        [
          `Amazing! You are number 1 on the Dojo Leaderboard with ${progress.xp} XP!`,
          `شاندار! آپ ${progress.xp} ایکس پی کے ساتھ ڈوجو لیڈر بورڈ پر نمبر 1 ہیں!`,
          `رائع! أنت في المركز الأول على لوحة المتصدرين برصيد ${progress.xp} نقطة!`,
        ] as Tri,
        lang
      );

  return (
    <article className="card mx-auto max-w-[960px] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[clamp(1.4rem,5vw,2rem)] font-black leading-tight">
            🏆 {tr('Dojo Leaderboard', 'ڈوجو لیڈر بورڈ', 'لوحة متصدري الدوجو')}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {tr(
              'Earn XP from lessons, voice exercises, quizzes, and matches — even offline!',
              'اسباق، آواز کی مشقوں، کوئز اور میچوں سے ایکس پی کمائیں — آف لائن بھی!',
              'اكسب النقاط من الدروس والتمارين الصوتية والاختبارات والمباريات — حتى دون اتصال!'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="ghost !py-2 !px-4 text-sm flex items-center gap-2"
            onClick={() => onSpeak(summarySpeech)}
          >
            <Volume2 className="w-4 h-4" />
            <span>{tr('Hear Rank', 'رینک سنیں', 'اسمع ترتيبك')}</span>
          </button>
          <button
            className="big-btn !py-2 !px-4 text-sm flex items-center gap-2"
            disabled={isSyncing || !isOnline}
            onClick={onSyncNow}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? tr('Syncing…', 'سنک ہو رہا ہے…', 'جارٍ المزامنة…')
                : pendingCount > 0
                ? `${tr('Sync Offline XP', 'آف لائن ایکس پی سنک کریں', 'مزامنة النقاط')} (${pendingCount})`
                : tr('Refresh Board', 'تازہ کریں', 'تحديث اللوحة')}
            </span>
          </button>
        </div>
      </div>

      {/* Athlete current rank banner */}
      <div className="mt-4 rounded-2xl border-[3px] border-[#0F172A] bg-[#FEF08A] p-4 text-[#0F172A]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-[#0F172A] bg-white text-3xl">
              {progress.avatar}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {tr('Your Dojo Standing', 'آپ کی موجودہ پوزیشن', 'مركزك الحالي')}
              </div>
              <div className="text-xl font-black tabular-nums">
                #{myRank} • {(progress.athleteName && progress.athleteName.trim()) || tr('Champion Athlete', 'چیمپئن کھلاڑی', 'الرياضي البطل')}
              </div>
              <div className="text-sm font-bold">
                {nextAbove
                  ? tr(
                      `${xpToPass} XP away from passing ${nextAbove.name}!`,
                      `${nextAbove.name} سے آگے جانے کے لیے ${xpToPass} ایکس پی باقی!`,
                      `تحتاج ${xpToPass} نقطة لتتقدم على ${nextAbove.name}!`
                    )
                  : tr('You lead the Dojo! Keep helping classmates!', 'آپ ڈوجو میں سب سے آگے ہیں!', 'أنت في الصدارة! واصل مساعدة زملائك!')}
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-center tabular-nums">
            <div>
              <div className="text-2xl font-black">{progress.xp}</div>
              <div className="text-xs font-black">XP</div>
            </div>
            <div>
              <div className="text-2xl font-black">{progress.streak}</div>
              <div className="text-xs font-black">{tr('Streak', 'سلسلہ', 'السلسلة')}</div>
            </div>
            <div>
              <div className="text-2xl font-black">
                {progress.medals.gold + progress.medals.silver + progress.medals.bronze}
              </div>
              <div className="text-xs font-black">{tr('Medals', 'تمغے', 'ميداليات')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4 items-end">
          {[1, 0, 2].map((pos) => {
            const entry = top3[pos];
            if (!entry) return <div key={pos} />;
            const isFirst = pos === 0;
            const isMe = entry.id === progress.profileId;
            const bg = isFirst ? '#FDE047' : pos === 1 ? '#E2E8F0' : '#FED7AA';
            const medalIcon = isFirst ? '🥇' : pos === 1 ? '🥈' : '🥉';
            return (
              <div
                key={entry.id}
                className="flex flex-col items-center text-center"
              >
                <div className="text-4xl sm:text-5xl leading-none">{entry.avatar}</div>
                <div className="mt-1 text-2xl sm:text-3xl leading-none">{medalIcon}</div>
                <div className="mt-1 font-black text-sm sm:text-base truncate max-w-full px-1">
                  {entry.name} {isMe ? '⭐' : ''}
                </div>
                <div className="text-xs font-black text-[var(--muted)] tabular-nums mb-2">
                  {entry.xp} XP
                </div>
                <div
                  className="w-full rounded-t-2xl border-[3px] border-b-0 border-[#0F172A] p-2 text-[#0F172A] flex flex-col justify-center items-center"
                  style={{ height: isFirst ? 104 : pos === 1 ? 82 : 66, background: bg }}
                >
                  <div className="text-xl sm:text-2xl font-black tabular-nums">#{pos + 1}</div>
                  <div className="text-[11px] font-black truncate max-w-full">
                    {pick(DEFAULT_NAMES[entry.beltIndex] || DEFAULT_NAMES[0], lang)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter & Sort Controls */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-2xl bg-[var(--surface2)] border-2 border-[var(--line)] p-1">
          <button
            onClick={() => setSortBy('xp')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition min-h-[40px] flex items-center gap-1 ${
              sortBy === 'xp' ? 'bg-[#1D4ED8] text-white' : 'text-[var(--text)]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{tr('By XP', 'ایکس پی', 'حسب النقاط')}</span>
          </button>
          <button
            onClick={() => setSortBy('medals')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition min-h-[40px] flex items-center gap-1 ${
              sortBy === 'medals' ? 'bg-[#1D4ED8] text-white' : 'text-[var(--text)]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{tr('By Medals', 'تمغے', 'حسب الميداليات')}</span>
          </button>
          <button
            onClick={() => setSortBy('streak')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition min-h-[40px] flex items-center gap-1 ${
              sortBy === 'streak' ? 'bg-[#1D4ED8] text-white' : 'text-[var(--text)]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{tr('By Streak', 'سلسلہ', 'حسب السلسلة')}</span>
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-[var(--surface2)] border-2 border-[var(--line)] p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black min-h-[40px] ${
              filter === 'all' ? 'bg-[#0F172A] text-white' : 'text-[var(--text)]'
            }`}
          >
            {tr('All Athletes', 'سب کھلاڑی', 'كل اللاعبين')} ({mergedEntries.length})
          </button>
          <button
            onClick={() => setFilter('top5')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black min-h-[40px] ${
              filter === 'top5' ? 'bg-[#0F172A] text-white' : 'text-[var(--text)]'
            }`}
          >
            {tr('Top 5', 'ٹاپ 5', 'أفضل 5')}
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="mt-4 space-y-2.5">
        {shown.map((entry, idx) => {
          const rank = mergedEntries.findIndex((e) => e.id === entry.id) + 1;
          const isMe = entry.id === progress.profileId;
          const dan = entry.beltIndex >= 5 ? entry.beltIndex - 5 : 0;
          return (
            <div
              key={entry.id}
              className="rounded-2xl border-[3px] p-3 sm:p-4 transition-transform"
              style={{
                borderColor: isMe ? '#1D4ED8' : 'var(--line)',
                background: isMe ? '#EFF6FF' : 'var(--surface2)',
                color: isMe ? '#0F172A' : 'var(--text)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-[#0F172A] font-black text-base tabular-nums"
                    style={{
                      background:
                        rank === 1 ? '#FDE047' : rank === 2 ? '#E2E8F0' : rank === 3 ? '#FED7AA' : '#FFFFFF',
                      color: '#0F172A',
                    }}
                  >
                    #{rank}
                  </div>
                  <div className="text-3xl shrink-0">{entry.avatar}</div>
                  <div className="min-w-0">
                    <div className="font-black text-base sm:text-lg truncate">
                      {entry.name} {isMe ? `(${tr('You', 'آپ', 'أنت')})` : ''}
                    </div>
                    <div className="text-xs font-bold opacity-80 flex flex-wrap items-center gap-2">
                      <span>{pick(DEFAULT_NAMES[entry.beltIndex] || DEFAULT_NAMES[0], lang)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{entry.lessonsDone} {tr('lessons', 'اسباق', 'دروس')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{entry.streak} {tr('streak', 'سلسلہ', 'سلسلة')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 tabular-nums">
                  <div className="text-xs sm:text-sm font-black whitespace-nowrap">
                    🥇 {entry.medals.gold} · 🥈 {entry.medals.silver} · 🥉 {entry.medals.bronze}
                  </div>
                  <div className="rounded-xl border-2 border-[#0F172A] bg-white px-3 py-1.5 text-base font-black text-[#0F172A]">
                    {entry.xp} XP
                  </div>
                </div>
              </div>
              <div className="mt-2 max-w-[260px]">
                <BeltVisual color={BELT_COLORS[entry.beltIndex] || '#f8fafc'} dan={dan} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};
