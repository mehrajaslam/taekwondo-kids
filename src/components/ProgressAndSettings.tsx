import React, { useState } from 'react';
import { RefreshCw, Volume2, CheckCircle2, CloudOff, Wifi } from 'lucide-react';
import {
  AVATARS,
  BELT_COLORS,
  BELT_FRIENDS,
  DEFAULT_NAMES,
  DEFAULT_SETTINGS,
  pick,
  THRESHOLDS,
} from '../data/taekwondoData';
import { Lang, Progress } from '../types/taekwondo';
import { BeltVisual } from './BeltVisual';

interface ProgressSectionProps {
  mode: 'progress' | 'customize';
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
  unlockedIndex: number;
  lang: Lang;
  athleteInput: string;
  setAthleteInput: (v: string) => void;
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: string;
  isSyncing: boolean;
  cachedAudioCount: number;
  totalAudioCount: number;
  audioCaching: boolean;
  onSyncNow: () => void;
  onCacheAllAudio: () => void;
  onResetAll: () => void;
  onToast: (msg: string) => void;
  onBeep: (freq?: number, dur?: number, type?: OscillatorType) => void;
  onStopSpeak: () => void;
  t: (k: string) => string;
  tr: (en: string, ur: string, ar: string) => string;
}

export const ProgressAndSettings: React.FC<ProgressSectionProps> = ({
  mode,
  progress,
  setProgress,
  unlockedIndex,
  lang,
  athleteInput,
  setAthleteInput,
  isOnline,
  pendingCount,
  lastSyncedAt,
  isSyncing,
  cachedAudioCount,
  totalAudioCount,
  audioCaching,
  onSyncNow,
  onCacheAllAudio,
  onResetAll,
  onToast,
  onBeep,
  onStopSpeak,
  t,
  tr,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [customText, setCustomText] = useState(progress.settings.beltNames.join('\n'));
  const [view, setView] = useState<'charts' | 'parent'>('charts');

  const nextRank = THRESHOLDS[unlockedIndex + 1];
  const currentThreshold = THRESHOLDS[unlockedIndex];
  const pct = nextRank ? Math.min(100, ((progress.xp - currentThreshold) / (nextRank - currentThreshold)) * 100) : 100;
  const displayBeltName =
    lang === 'en'
      ? progress.settings.beltNames[unlockedIndex] || pick(DEFAULT_NAMES[unlockedIndex], lang)
      : pick(DEFAULT_NAMES[unlockedIndex], lang);

  if (mode === 'customize') {
    const langBtn = (l: Lang, flag: string, label: string) => (
      <button
        key={l}
        onClick={() => {
          onStopSpeak();
          setProgress((p) => ({ ...p, language: l }));
          onBeep(600, 0.07);
        }}
        aria-pressed={lang === l}
        className="rounded-full px-4 py-2 text-sm font-black min-h-[44px]"
        style={{
          background: lang === l ? '#FACC15' : 'var(--surface2)',
          color: lang === l ? '#431407' : 'var(--text)',
          border: lang === l ? '3px solid #0F172A' : '2px solid var(--line)',
        }}
      >
        {flag} {label}
      </button>
    );

    return (
      <article className="card mx-auto max-w-[760px] p-5">
        <h2 className="text-2xl font-black">⚙️ {t('customTitle')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t('customDesc')}</p>

        <div className="mt-4 rounded-2xl bg-[var(--surface2)] p-4 border-2 border-[var(--line)]">
          <p className="font-black">{t('langLbl')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {langBtn('en', '🇬🇧', 'English')}
            {langBtn('ur', '🇵🇰', 'اردو')}
            {langBtn('ar', '🇸🇦', 'العربية')}
          </div>
          <p className="mt-4 font-black">
            {t('fighterNow')} <span className="text-3xl">{progress.avatar}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setProgress((p) => ({ ...p, avatar: a }))}
                className="grid h-14 w-14 place-items-center rounded-full bg-white text-2xl border-4"
                style={{ borderColor: progress.avatar === a ? '#facc15' : 'var(--line)' }}
                aria-label={`${t('choose')} ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[var(--surface2)] p-4 border-2 border-[var(--line)]">
          <label className="!m-0 flex items-center gap-2 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={progress.autoRead}
              onChange={(e) => setProgress((p) => ({ ...p, autoRead: e.target.checked }))}
              className="!w-auto"
            />
            {t('autoRead')}
          </label>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('autoReadDesc')}</p>
          <p className="mt-3 font-black">{t('speedLbl')}</p>
          <div className="mt-2 flex gap-2">
            <button
              className="ghost !py-2"
              aria-pressed={progress.speechRate === 0.7}
              onClick={() => setProgress((p) => ({ ...p, speechRate: 0.7 }))}
            >
              🐢 {t('slow')}
            </button>
            <button
              className="ghost !py-2"
              aria-pressed={progress.speechRate === 1}
              onClick={() => setProgress((p) => ({ ...p, speechRate: 1 }))}
            >
              ▶️ {t('normal')}
            </button>
          </div>
        </div>

        <label htmlFor="org">{t('org')}</label>
        <select
          id="org"
          value={progress.settings.organization}
          onChange={(e) => setProgress((p) => ({ ...p, settings: { ...p.settings, organization: e.target.value } }))}
        >
          <option>Kukkiwon / WT</option>
          <option>ITF</option>
          <option>Custom</option>
        </select>

        <label htmlFor="poom">{t('poomSys')}</label>
        <select
          id="poom"
          value={progress.settings.poomsaeSystem}
          onChange={(e) => setProgress((p) => ({ ...p, settings: { ...p.settings, poomsaeSystem: e.target.value } }))}
        >
          <option>Taegeuk</option>
          <option>Chang-Hon</option>
          <option>Custom</option>
        </select>

        <label htmlFor="belts">{t('beltNamesLbl')}</label>
        <textarea id="belts" rows={6} value={customText} onChange={(e) => setCustomText(e.target.value)} />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="big-btn flex-1"
            onClick={() => {
              const names = customText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
              if (names.length < 15) {
                onToast(t('beltNamesLbl'));
                return;
              }
              setProgress((p) => ({ ...p, settings: { ...p.settings, beltNames: names.slice(0, 15) } }));
              onToast(t('saved'));
            }}
          >
            {t('saveAcademy')}
          </button>
          <button
            className="ghost"
            onClick={() => {
              setProgress((p) => ({ ...p, settings: DEFAULT_SETTINGS }));
              setCustomText(DEFAULT_NAMES.map((x) => x[0]).join('\n'));
              onToast(t('saved'));
            }}
          >
            {t('resetDefault')}
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">{t('customHint')}</p>
      </article>
    );
  }

  return (
    <div className="space-y-4 mx-auto max-w-[960px]">
      {/* Offline Sync & Audio Readiness Hub */}
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              {isOnline ? <Wifi className="w-5 h-5 text-emerald-600" /> : <CloudOff className="w-5 h-5 text-amber-600" />}
              <span>{t('offlineTitle')}</span>
            </h2>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {isOnline
                ? tr(
                    'Connected — progress syncs automatically with the Dojo Leaderboard.',
                    'منسلک ہے — ترقی خودکار طور پر ڈوجو لیڈر بورڈ کے ساتھ سنک ہوتی ہے۔',
                    'متصل — تتم مزامنة التقدم تلقائياً مع لوحة المتصدرين.'
                  )
                : tr(
                    'Offline mode active — keep learning & playing! Your XP will sync automatically when online.',
                    'آف لائن موڈ فعال ہے — سیکھنا جاری رکھیں! آن لائن ہونے پر ایکس پی خودکار سنک ہوگا۔',
                    'وضع عدم الاتصال نشط — واصل التعلم! ستتم مزامنة نقاطك تلقائياً عند عودة الاتصال.'
                  )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="ghost !py-2 !px-4 text-sm flex items-center gap-2"
              disabled={audioCaching}
              onClick={onCacheAllAudio}
            >
              <Volume2 className="w-4 h-4" />
              <span>
                {audioCaching
                  ? tr('Caching Audio…', 'آڈیو محفوظ ہو رہا ہے…', 'جارٍ حفظ الصوت…')
                  : `${t('cacheAudioBtn')} (${cachedAudioCount}/${totalAudioCount})`}
              </span>
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
                  : `${t('syncNow')}${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm font-bold tabular-nums">
          <div className="rounded-xl border-2 border-[var(--line)] bg-[var(--surface2)] p-3 flex items-center justify-between">
            <span>{tr('Pending Offline Sync', 'زیر التواء آف لائن سنک', 'مزامنة معلقة')}</span>
            <span className="font-black">{pendingCount}</span>
          </div>
          <div className="rounded-xl border-2 border-[var(--line)] bg-[var(--surface2)] p-3 flex items-center justify-between">
            <span>{tr('Offline Audio Tracks', 'آف لائن آڈیو ٹریکس', 'ملفات الصوت دون اتصال')}</span>
            <span className="font-black flex items-center gap-1">
              {cachedAudioCount >= totalAudioCount && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {cachedAudioCount} / {totalAudioCount}
            </span>
          </div>
          <div className="rounded-xl border-2 border-[var(--line)] bg-[var(--surface2)] p-3 flex items-center justify-between">
            <span>{tr('Last Synced', 'آخری سنک', 'آخر مزامنة')}</span>
            <span className="font-black text-xs">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : tr('Not yet', 'ابھی نہیں', 'ليس بعد')}
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView('charts')} className={`tab-btn ${view === 'charts' ? 'active' : ''}`}>
          📊 {tr('Athlete Charts & Report Card', 'کھلاڑی چارٹس اور رپورٹ کارڈ', 'رسوم الرياضي وبطاقة التقرير')}
        </button>
        <button onClick={() => setView('parent')} className={`tab-btn ${view === 'parent' ? 'active' : ''}`}>
          👨‍👩‍👧 {t('parentTitle')}
        </button>
      </div>

      {view === 'charts' && (
        <article className="card p-5" style={{ background: '#FFFFFF', color: '#0F172A' }}>
          <h2 className="text-2xl font-black text-[#0F172A]">📊 {tr('Athlete Charts', 'کھلاڑی چارٹس', 'رسوم الرياضي')}</h2>
          <p className="mt-1 text-sm font-bold text-[#475569]">
            {tr('Track your belt journey, skills, medals, and weekly practice!', 'اپنے بیلٹ کا سفر، مہارتیں، تمغے اور ہفتہ وار مشق دیکھیں!', 'تابع رحلة الحزام والمهارات والميداليات والتدريب الأسبوعي!')}
          </p>

          <div className="mt-4 rounded-2xl bg-[#F8FAFC] border-[3px] border-[#0F172A] p-4">
            <label className="!text-[#0F172A] !mt-0">{tr('Athlete Name (shown on Leaderboard & Report Card)', 'کھلاڑی کا نام', 'اسم الرياضي')}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={athleteInput}
                onChange={(e) => setAthleteInput(e.target.value)}
                placeholder={tr('Type your name, champion!', 'اپنا نام لکھیں، چیمپئن!', 'اكتب اسمك يا بطل!')}
              />
              <button
                className="big-btn !min-h-[52px] shrink-0"
                onClick={() => {
                  if (!athleteInput.trim()) {
                    onToast(tr('Please type a name first!', 'پہلے نام لکھیں!', 'اكتب اسماً أولاً!'));
                    return;
                  }
                  setProgress((p) => ({ ...p, athleteName: athleteInput.trim() }));
                  onToast(t('saved'));
                }}
              >
                {tr('Save Name', 'نام محفوظ کریں', 'حفظ الاسم')}
              </button>
            </div>
            <p className="mt-2 font-black text-[#0F172A]">
              {tr('Athlete:', 'کھلاڑی:', 'الرياضي:')} {progress.athleteName || tr('Champion Athlete', 'چیمپئن کھلاڑی', 'الرياضي البطل')} · {displayBeltName} {t('belt')}
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-white border-[3px] border-[#0F172A] p-4">
            <h3 className="text-lg font-black text-[#0F172A]">🏅 {tr('Medal Counts', 'میڈل گنتی', 'عدد الميداليات')}</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center tabular-nums">
              <div className="rounded-2xl border-[3px] border-[#0F172A] bg-[#FDE047] p-3">
                <div className="text-4xl">🥇</div>
                <div className="text-2xl font-black text-[#0F172A]">{progress.medals?.gold || 0}</div>
                <div className="text-xs font-black text-[#0F172A]">{tr('Gold', 'گولڈ', 'ذهبي')}</div>
              </div>
              <div className="rounded-2xl border-[3px] border-[#0F172A] bg-[#E5E7EB] p-3">
                <div className="text-4xl">🥈</div>
                <div className="text-2xl font-black text-[#0F172A]">{progress.medals?.silver || 0}</div>
                <div className="text-xs font-black text-[#0F172A]">{tr('Silver', 'سلور', 'فضي')}</div>
              </div>
              <div className="rounded-2xl border-[3px] border-[#0F172A] bg-[#FED7AA] p-3">
                <div className="text-4xl">🥉</div>
                <div className="text-2xl font-black text-[#0F172A]">{progress.medals?.bronze || 0}</div>
                <div className="text-xs font-black text-[#0F172A]">{tr('Bronze', 'برونز', 'برونزي')}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white border-[3px] border-[#0F172A] p-4">
            <h3 className="text-lg font-black text-[#0F172A]">⭐ {tr('XP per Activity', 'ہر سرگرمی پر ایکس پی', 'نقاط كل نشاط')}</h3>
            <div className="mt-3 space-y-3 tabular-nums">
              {[
                { label: tr('Lessons', 'اسباق', 'الدروس'), xp: progress.completedLessons.length * 50, color: '#1D4ED8' },
                { label: tr('Quiz', 'کوئز', 'الاختبار'), xp: progress.quizWins * 25, color: '#DC2626' },
                { label: tr('Reaction', 'تیز ردعمل', 'رد الفعل'), xp: Math.floor(progress.bestReaction / 2), color: '#F59E0B' },
                { label: tr('Movies', 'فلمیں', 'الأفلام'), xp: progress.movieWatched.length * 30, color: '#16A34A' },
              ].map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-black text-[#0F172A]">
                    <span>{r.label}</span>
                    <span>{r.xp} XP</span>
                  </div>
                  <div className="mt-1 h-[34px] overflow-hidden rounded-xl bg-[#F1F5F9] border-[3px] border-[#0F172A]">
                    <div
                      className="chart-bar h-full"
                      style={{
                        width: `${Math.max(12, Math.min(100, (r.xp / Math.max(1, progress.xp)) * 100))}%`,
                        background: r.color,
                        color: '#fff',
                      }}
                    >
                      {r.xp} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="report-card mt-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-widest">🏆 {tr('REPORT CARD', 'رپورٹ کارڈ', 'بطاقة التقرير')}</p>
                <h3 className="mt-1 text-[clamp(1.5rem,6vw,2.2rem)] font-black leading-tight">
                  {progress.athleteName || tr('Champion Athlete', 'چیمپئن کھلاڑی', 'الرياضي البطل')}
                </h3>
                <p className="font-bold tabular-nums">
                  {tr('Belt:', 'بیلٹ:', 'الحزام:')} {displayBeltName} · {progress.xp} XP · {progress.streak} {t('streak')}
                </p>
              </div>
              <span className="text-6xl">🏆</span>
            </div>
            <div className="mt-2">
              <BeltVisual color={BELT_COLORS[unlockedIndex]} dan={unlockedIndex >= 5 ? unlockedIndex - 5 : 0} large />
            </div>
            <p className="mt-3 text-center font-black">🌟 {tr('Keep going, champion! You are a star!', 'جاری رکھیں، چیمپئن! آپ اسٹار ہیں!', 'واصل يا بطل! أنت نجم!')}</p>
          </div>
        </article>
      )}

      {view === 'parent' && (
        <article className="card p-5">
          <h2 className="text-2xl font-black">👨‍👩‍👧 {t('parentTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('parentDesc')}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 tabular-nums">
            {[
              [t('totalXP2'), `${progress.xp} ${t('xp')}`, '⭐'],
              [t('lessonsDone'), `${progress.completedLessons.length} / 15`, '📖'],
              [t('quizzesPassed'), `${progress.quizWins}`, '🧠'],
              [t('bestScore'), `${progress.bestReaction}`, '⚡'],
              [t('sessions'), `${progress.sessions}`, '🕐'],
              [t('currentBelt'), displayBeltName, '🥋'],
            ].map(([l, v, ic], i) => (
              <div key={i} className="rounded-2xl border-2 border-[var(--line)] bg-[var(--surface2)] p-3">
                <div className="text-2xl">{ic}</div>
                <div className="font-black text-lg leading-tight">{v}</div>
                <div className="text-xs text-[var(--muted)]">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border-2 border-[var(--line)] p-4">
            <div className="font-black">
              {t('nextBelt')}: {nextRank ? pick(DEFAULT_NAMES[unlockedIndex + 1], lang) : t('highest')}
            </div>
            <div className="progress-track mt-2">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-sm tabular-nums">
              {Math.round(pct)}% · {progress.xp} / {nextRank || progress.xp} {t('xp')}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-black">🏅 {t('beltsDone')}</h3>
            {progress.completedLessons.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{t('noBeltsYet')}</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {[...progress.completedLessons]
                  .sort((a, b) => a - b)
                  .map((i) => (
                    <li
                      key={i}
                      className="flex justify-between gap-2 rounded-xl bg-[var(--surface2)] border border-[var(--line)] px-3 py-2 text-sm font-bold"
                    >
                      <span>
                        {BELT_FRIENDS[i].animal} {pick(DEFAULT_NAMES[i], lang)} {t('belt')}
                      </span>
                      <span className="tabular-nums">{progress.lessonDates?.[String(i)] || '—'}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-[var(--surface2)] p-4">
            <h3 className="font-black">💛 {t('tipsTitle')}</h3>
            <ul className="mt-2 list-disc ps-5 text-sm leading-relaxed space-y-1">
              <li>{t('tip1')}</li>
              <li>{t('tip2')}</li>
              <li>{t('tip3')}</li>
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {confirmReset ? (
              <>
                <button
                  className="rounded-full bg-red-600 px-4 py-3 text-sm font-black text-white min-h-[44px]"
                  onClick={() => {
                    setConfirmReset(false);
                    onResetAll();
                  }}
                >
                  {t('confirmReset')}
                </button>
                <button className="ghost" onClick={() => setConfirmReset(false)}>
                  {t('keepProgress')}
                </button>
              </>
            ) : (
              <button
                className="rounded-full bg-red-600 px-4 py-3 text-sm font-black text-white min-h-[44px]"
                onClick={() => setConfirmReset(true)}
              >
                {t('resetProgress')}
              </button>
            )}
          </div>
        </article>
      )}
    </div>
  );
};
