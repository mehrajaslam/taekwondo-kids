import React, { useEffect, useState } from 'react';
import { Volume2, Square, Play, Pause, RotateCcw } from 'lucide-react';
import {
  BELT_COLORS,
  BELT_DEEP_GUIDES,
  BELT_FRIENDS,
  BELT_RANKS_ML,
  COACH_TV,
  DEFAULT_NAMES,
  DOJANG_COMMANDS,
  KNOWLEDGE,
  KOREAN_COUNTING,
  MOVIES,
  pick,
  POOMSAE,
  TAEKWONDO_TENETS,
  THRESHOLDS,
} from '../data/taekwondoData';
import { Lang, Progress } from '../types/taekwondo';
import { BeltVisual } from './BeltVisual';

interface LearnSectionProps {
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
  selected: number;
  setSelected: (i: number) => void;
  unlockedIndex: number;
  lang: Lang;
  speaking: boolean;
  onSpeak: (text: string, exerciseId?: string, category?: 'lesson' | 'move' | 'poomsae' | 'coach') => void;
  onSpeakKid: (text: string, exerciseId?: string) => void;
  onSpeakCoach: (text: string, exerciseId?: string) => void;
  onStopSpeak: () => void;
  onBeep: (freq?: number, dur?: number, type?: OscillatorType) => void;
  onAddXp: (n: number, msg?: string) => void;
  onCheer: (msg: string) => void;
  onJumpToPlay: (game: 'quiz' | 'memory' | 'matching' | 'reaction') => void;
  t: (k: string) => string;
  tr: (en: string, ur: string, ar: string) => string;
}

export const LearnSection: React.FC<LearnSectionProps> = ({
  progress,
  setProgress,
  selected,
  setSelected,
  unlockedIndex,
  lang,
  speaking,
  onSpeak,
  onSpeakKid,
  onSpeakCoach,
  onStopSpeak,
  onBeep,
  onAddXp,
  onCheer,
  onJumpToPlay,
  t,
  tr,
}) => {
  const [subTab, setSubTab] = useState<'belts' | 'encyclopedia' | 'poomsae' | 'movies' | 'coachtv'>('belts');
  const [previewAllBelts, setPreviewAllBelts] = useState(true);
  const [guideFilter, setGuideFilter] = useState<'all' | 'color' | 'dan'>('all');
  const [kikiQuizPicked, setKikiQuizPicked] = useState<Record<number, number>>({});
  const [kikiQuizBonusDone, setKikiQuizBonusDone] = useState<number[]>([]);
  const [kikiSpeechBubble, setKikiSpeechBubble] = useState<string>('');
  const [poomsaeStep, setPoomsaeStep] = useState(0);
  const [followMe, setFollowMe] = useState(false);

  const [movieIdx, setMovieIdx] = useState(0);
  const [movieStep, setMovieStep] = useState(0);
  const [moviePlaying, setMoviePlaying] = useState(false);
  const [movieSpeed, setMovieSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [theaterLarge, setTheaterLarge] = useState(true);

  const [coachTvMovie, setCoachTvMovie] = useState(0);
  const [coachTvStep, setCoachTvStep] = useState(0);
  const [coachTvPlaying, setCoachTvPlaying] = useState(false);
  const [coachTvSpeed, setCoachTvSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  const rtl = lang !== 'en';
  const knowledge = KNOWLEDGE[selected];
  const deepGuide = BELT_DEEP_GUIDES[selected] || BELT_DEEP_GUIDES[0];
  const beltName =
    progress.settings.beltNames[selected] && lang === 'en'
      ? progress.settings.beltNames[selected]
      : pick(DEFAULT_NAMES[selected], lang);

  const lessonText = `${beltName}. ${pick(deepGuide.kikiIntro, lang)} ${pick(knowledge.meaning, lang)}. ${pick(knowledge.desc, lang)}. ${pick(deepGuide.poomsaeMeaning, lang)} ${pick(knowledge.fun, lang)}. ${pick(knowledge.try, lang)}`;
  const fullKikiStory = `${pick(deepGuide.kikiIntro, lang)} ${pick(deepGuide.symbolism, lang)} ${pick(deepGuide.poomsaeMeaning, lang)} ${pick(deepGuide.spiritQuote, lang)}`;

  useEffect(() => {
    if (!followMe) return;
    const tt = setInterval(() => setPoomsaeStep((s) => (s + 1) % POOMSAE.length), 1800);
    return () => clearInterval(tt);
  }, [followMe]);

  const currentMovie = MOVIES[movieIdx];
  const movieSpeedMs = movieSpeed === 'slow' ? 3400 : movieSpeed === 'fast' ? 1200 : 2100;
  useEffect(() => {
    if (!moviePlaying) return;
    const tt = setInterval(() => {
      setMovieStep((s) => {
        if (s >= currentMovie.steps.length - 1) {
          setMoviePlaying(false);
          return s;
        }
        return s + 1;
      });
    }, movieSpeedMs);
    return () => clearInterval(tt);
  }, [moviePlaying, movieIdx, movieSpeed, currentMovie.steps.length, movieSpeedMs]);

  const coachTvCurrent = COACH_TV[coachTvMovie];
  const coachTvCurrentStep = coachTvCurrent.steps[coachTvStep];
  const coachTvSpeedMs = coachTvSpeed === 'slow' ? 3400 : coachTvSpeed === 'fast' ? 1200 : 2100;
  const coachTvBeltColor =
    coachTvMovie === 1
      ? ['#f8fafc', '#22c55e', '#2563eb', '#dc2626'][coachTvStep]
      : coachTvMovie === 2
      ? ['#f8fafc', '#facc15', '#22c55e'][coachTvStep]
      : coachTvMovie === 3
      ? '#111827'
      : '#f8fafc';

  useEffect(() => {
    if (!coachTvPlaying) return;
    const tt = setInterval(() => {
      setCoachTvStep((s) => {
        if (s >= coachTvCurrent.steps.length - 1) {
          setCoachTvPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, coachTvSpeedMs);
    return () => clearInterval(tt);
  }, [coachTvPlaying, coachTvMovie, coachTvSpeed, coachTvCurrent.steps.length, coachTvSpeedMs]);

  return (
    <div className="space-y-4">
      {/* Clean Sub-navigation for Learning Activities */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Learning Activities">
        {[
          ['belts', `🥋 ${tr('Belt Lessons', 'بیلٹ اسباق', 'دروس الأحزمة')}`],
          ['encyclopedia', `📖 ${tr('Belt-to-Dan Guide', 'بیلٹ تا ڈان گائیڈ', 'دليل الأحزمة والدان')}`],
          ['poomsae', `🌀 ${t('poomsae')}`],
          ['movies', `🎬 ${t('movies')}`],
          ['coachtv', `📺 ${tr('Coach TV', 'کوچ ٹی وی', 'تلفزيون المدرب')}`],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={subTab === id}
            onClick={() => {
              onStopSpeak();
              setSubTab(id as typeof subTab);
              onBeep(540, 0.06);
            }}
            className={`tab-btn ${subTab === id ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Belt Adventure Path */}
      {subTab === 'belts' && (
        <>
          <section aria-label="Belt progression">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[clamp(1.25rem,5vw,1.7rem)] font-black">🗺️ {t('pathTitle')}</h2>
                <span className="text-sm text-[var(--muted)]">{t('tapBelt')}</span>
              </div>
              <button
                onClick={() => setPreviewAllBelts((v) => !v)}
                aria-pressed={previewAllBelts}
                className="ghost !py-2 !px-4 text-xs sm:text-sm"
              >
                {previewAllBelts
                  ? tr('👀 Explorer Mode: All 15 Belts Open', '👀 ایکسپلورر موڈ: تمام 15 بیلٹ کھلے', '👀 وضع الاستكشاف: كل الأحزمة مفتوحة')
                  : tr('🔒 Explorer Mode: Unlocked Only', '🔒 صرف کھلے بیلٹ', '🔒 المفتوحة فقط')}
              </button>
            </div>
            <div className="card relative p-4">
              <div className="relative mb-2">
                <div className="path-track" />
                <div
                  className="absolute -top-5 transition-all duration-500"
                  style={
                    rtl
                      ? { right: `calc(${Math.min(94, (unlockedIndex / 14) * 100)}%)` }
                      : { left: `calc(${Math.min(94, (unlockedIndex / 14) * 100)}%)` }
                  }
                >
                  <span className="text-3xl drop-shadow">{progress.avatar}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {THRESHOLDS.map((th, i) => {
                  const unlocked = i <= unlockedIndex;
                  const canOpen = unlocked || previewAllBelts;
                  const active = i === selected;
                  const dan = i >= 5 ? i - 5 : 0;
                  return (
                    <button
                      key={i}
                      disabled={!canOpen}
                      onClick={() => {
                        setSelected(i);
                        const g = BELT_DEEP_GUIDES[i];
                        if (g) {
                          const intro = pick(g.kikiIntro, lang);
                          setKikiSpeechBubble(intro);
                          onCheer(pick(g.spiritQuote, lang));
                          if (progress.autoRead) {
                            onSpeakKid(intro, `kiki-guide-${i}`);
                          }
                        }
                        onBeep(560, 0.07);
                      }}
                      className="card belt-3d pop min-h-[160px] p-3 text-left"
                      style={{
                        opacity: unlocked ? 1 : canOpen ? 0.85 : 0.55,
                        border: active ? '4px solid var(--primary)' : '3px solid var(--line)',
                      }}
                      aria-label={`${pick(DEFAULT_NAMES[i], lang)}, ${unlocked ? t('unlocked') : t('locked')}, ${th} ${t('xp')}`}
                    >
                      <div className="text-3xl">{BELT_FRIENDS[i].animal}</div>
                      <BeltVisual color={BELT_COLORS[i]} dan={dan} />
                      <div className="mt-2 font-black leading-tight">
                        {pick(DEFAULT_NAMES[i], lang)} {i >= 5 ? '' : t('belt')}
                      </div>
                      <div className="text-[12px] font-bold text-[var(--muted)]">
                        {pick(BELT_FRIENDS[i].name, lang)}
                      </div>
                      <div className="text-xs text-[var(--muted)] tabular-nums">
                        {pick(BELT_RANKS_ML[i], lang)} · {th} {t('xp')}
                      </div>
                      <div className="mt-1 text-sm font-bold">
                        {unlocked ? '🔓' : '👀'} {active ? `· ${t('here')}` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <article className="card p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">
                    {pick(BELT_RANKS_ML[selected], lang)} · {THRESHOLDS[selected]} {t('xp')} ·{' '}
                    {BELT_FRIENDS[selected].animal} {pick(BELT_FRIENDS[selected].name, lang)}
                  </p>
                  <h2 className="text-[clamp(1.5rem,5vw,2.1rem)] font-black leading-tight">
                    {beltName} {t('knowledge')}
                  </h2>
                </div>
                <span className="text-5xl">{BELT_FRIENDS[selected].animal}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="ghost !py-2 !px-4 text-sm flex items-center gap-2"
                  onClick={() => (speaking ? onStopSpeak() : onSpeak(lessonText, `belt-lesson-${selected}`, 'lesson'))}
                >
                  {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>
                    {speaking ? t('stop') : t('listen')} · {progress.speechRate === 0.7 ? t('slow') : t('normal')}
                  </span>
                </button>
                <button
                  className="ghost !py-2 !px-4 text-sm"
                  onClick={() => setProgress((p) => ({ ...p, speechRate: p.speechRate === 0.7 ? 1 : 0.7 }))}
                >
                  {t('speedLbl')}: {progress.speechRate === 0.7 ? t('slow') : t('normal')}
                </button>
                <label className="!m-0 flex items-center gap-2 rounded-full border-2 border-[var(--line)] px-3 py-2 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={progress.autoRead}
                    onChange={(e) => setProgress((p) => ({ ...p, autoRead: e.target.checked }))}
                    className="!w-auto"
                  />
                  {t('autoRead')}
                </label>
              </div>

              <div className="mt-3">
                <BeltVisual color={BELT_COLORS[selected]} dan={selected >= 5 ? selected - 5 : 0} large />
              </div>
              <p className="mt-4 text-xl font-black">{pick(knowledge.meaning, lang)}</p>
              <p className="mt-2 text-[17px] leading-relaxed text-[var(--muted)]">{pick(knowledge.desc, lang)}</p>

              <div className="mt-4 rounded-2xl border-[3px] border-yellow-400 bg-yellow-50 p-4 text-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-black">💡 {t('didYouKnow')}</div>
                  <button
                    className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black min-h-[36px]"
                    onClick={() => onSpeak(pick(knowledge.fun, lang), `belt-lesson-${selected}`, 'lesson')}
                  >
                    🔊 {t('listen')}
                  </button>
                </div>
                <p className="mt-1 text-[15px] leading-relaxed">{pick(knowledge.fun, lang)}</p>
              </div>

              <div className="mt-3 rounded-2xl border-[3px] border-green-400 bg-green-50 p-4 text-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-black">🎮 {t('tryThis')}</div>
                  <button
                    className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black min-h-[36px]"
                    onClick={() => onSpeak(pick(knowledge.try, lang), `belt-lesson-${selected}`, 'move')}
                  >
                    🔊 {t('listen')}
                  </button>
                </div>
                <p className="mt-1 text-[15px] leading-relaxed">{pick(knowledge.try, lang)}</p>
              </div>

              <h3 className="mt-5 text-xl font-black">🥋 {t('moves')}</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {knowledge.tech.map((tech, i) => {
                  const moveTitle = pick(tech[1], lang);
                  const moveDesc = pick(tech[2], lang);
                  return (
                    <div key={i} className="rounded-2xl border-[3px] border-[var(--line)] bg-[var(--surface2)] p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-3xl">{tech[0]}</span>
                          <button
                            onClick={() => onSpeak(`${moveTitle}. ${moveDesc}`, `belt-${selected}-move-${i}`, 'move')}
                            aria-label={`${t('listen')} ${moveTitle}`}
                            className="rounded-full border-2 border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-black min-h-[36px] flex items-center gap-1"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{t('listen')}</span>
                          </button>
                        </div>
                        <div className="mt-1 font-black">{moveTitle}</div>
                        <div className="text-sm text-[var(--muted)]">{moveDesc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 className="mt-5 font-black">🗣️ {t('words')}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {knowledge.terms.map((term, i) => {
                  const label = pick(term, lang);
                  return (
                    <button
                      key={i}
                      onClick={() => onSpeak(label, `belt-${selected}-move-0`, 'move')}
                      className="rounded-full bg-[var(--surface2)] border-2 border-[var(--line)] px-3 py-2 text-sm font-bold flex items-center gap-1.5 min-h-[40px]"
                    >
                      <span>🔊</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Coach Kiki Interactive Storyteller Box */}
              <div
                className="mt-4 rounded-2xl border-[3px] p-4"
                style={{
                  background: 'var(--surface2)',
                  borderColor: 'var(--line)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="kiki-bounce inline-block text-4xl" aria-hidden="true">🎤</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
                        {pick(deepGuide.koreanRank, lang)}
                      </p>
                      <h3 className="text-lg font-black">
                        {tr("Coach Kiki's Belt Story", 'کوچ کیکی کی بیلٹ کہانی', 'قصة الحزام مع المدربة كيكي')}
                      </h3>
                    </div>
                  </div>
                  <button
                    className="big-btn yellow !py-2 !px-4 text-sm flex items-center gap-2"
                    onClick={() => {
                      if (speaking) {
                        onStopSpeak();
                      } else {
                        setKikiSpeechBubble(pick(deepGuide.kikiIntro, lang));
                        onSpeakKid(fullKikiStory, `kiki-guide-${selected}`);
                      }
                    }}
                  >
                    {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>
                      {speaking
                        ? t('stop')
                        : tr('Hear Kiki Tell Story!', 'کیکی کی آواز میں سنیں!', 'اسمع كيكي تحكي القصة!')}
                    </span>
                  </button>
                </div>

                <div
                  className="mt-3 rounded-2xl border-2 p-3 text-sm sm:text-base font-bold leading-relaxed"
                  style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--text)' }}
                >
                  “{kikiSpeechBubble || pick(deepGuide.kikiIntro, lang)}”
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  <div
                    className="rounded-2xl border-2 p-3"
                    style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                  >
                    <p className="font-black">🌱 {tr('Belt Meaning & Symbol', 'بیلٹ کا مطلب و علامت', 'معنى ورمز الحزام')}</p>
                    <p className="mt-1 text-[var(--muted)] leading-relaxed">{pick(deepGuide.symbolism, lang)}</p>
                  </div>
                  <div
                    className="rounded-2xl border-2 p-3"
                    style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                  >
                    <p className="font-black">
                      🌀 {tr('Official Poomsae', 'باضابطہ پومسے', 'البومساي الرسمي')} ({deepGuide.moveCount}{' '}
                      {tr('moves', 'حرکات', 'حركة')})
                    </p>
                    <p className="mt-1 text-[var(--muted)] leading-relaxed">{pick(deepGuide.poomsaeMeaning, lang)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black">⭐ “{pick(deepGuide.spiritQuote, lang)}”</p>
                  <button
                    className="ghost !py-1.5 !px-3 text-xs min-h-[40px]"
                    onClick={() => {
                      const q = pick(deepGuide.spiritQuote, lang);
                      setKikiSpeechBubble(q);
                      onSpeakKid(q, `kiki-guide-${selected}`);
                    }}
                  >
                    🔊 {tr('Hear Motto', 'نعرہ سنیں', 'اسمع الشعار')}
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm">
                <b>{t('poomsaeLbl')}</b> {pick(knowledge.poomsae, lang)}
              </p>
              <p className="mt-2 text-sm">
                <b>{t('safetyLbl')}</b> {knowledge.safety.map((s) => pick(s, lang)).join(' · ')}
              </p>

              {/* Kiki's Fun Mini-Challenge inside the Belt Lesson */}
              <div
                className="mt-4 rounded-2xl border-[3px] p-4"
                style={{ background: 'var(--surface2)', borderColor: 'var(--line)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-black">
                    🎤 {tr("Kiki's Mini-Challenge (+10 XP)", 'کیکی کا منی چیلنج (+10 ایکس پی)', 'تحدي كيكي المصغر (+10 نقاط)')}
                  </h3>
                  <button
                    className="ghost !py-1.5 !px-3 text-xs min-h-[40px]"
                    onClick={() => onSpeakKid(pick(deepGuide.kikiChallengeQ, lang), `kiki-guide-${selected}`)}
                  >
                    🔊 {t('listen')}
                  </button>
                </div>
                <p className="mt-2 text-base font-black">{pick(deepGuide.kikiChallengeQ, lang)}</p>
                <div className="mt-3 grid gap-2">
                  {deepGuide.kikiChallengeOptions.map((opt, idx) => {
                    const picked = kikiQuizPicked[selected];
                    const isPicked = picked === idx;
                    const isRight = idx === deepGuide.kikiChallengeAnswer;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setKikiQuizPicked((prev) => ({ ...prev, [selected]: idx }));
                          if (isRight) {
                            const praise = pick(deepGuide.kikiPraise, lang);
                            setKikiSpeechBubble(praise);
                            onSpeakKid(praise, `kiki-guide-${selected}`);
                            onBeep(740, 0.12, 'sine');
                            if (!kikiQuizBonusDone.includes(selected)) {
                              setKikiQuizBonusDone((prev) => [...prev, selected]);
                              onAddXp(10, `${praise} +10 ${t('xp')}`);
                            }
                          } else {
                            const retry = t('wrongMsg');
                            setKikiSpeechBubble(retry);
                            onSpeakKid(retry, 'kiki-welcome');
                            onBeep(260, 0.12, 'sawtooth');
                          }
                        }}
                        className={`answer !text-base !py-3 ${
                          picked !== undefined
                            ? isRight
                              ? 'correct'
                              : isPicked
                              ? 'wrong'
                              : ''
                            : ''
                        }`}
                      >
                        {pick(opt, lang)}
                      </button>
                    );
                  })}
                </div>
                {kikiQuizPicked[selected] === deepGuide.kikiChallengeAnswer && (
                  <p className="mt-2 text-sm font-black" style={{ color: 'var(--success)' }}>
                    🌟 {pick(deepGuide.kikiPraise, lang)}
                  </p>
                )}
              </div>

              <button
                className="big-btn mt-5 w-full"
                disabled={selected > unlockedIndex || progress.completedLessons.includes(selected)}
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setProgress((p) => ({
                    ...p,
                    completedLessons: [...p.completedLessons, selected],
                    lessonDates: { ...p.lessonDates, [selected]: today },
                  }));
                  onAddXp(50, `${t('lessonDoneMsg')} +50 ${t('xp')} 🎉`);
                  onCheer(t('lessonDoneMsg'));
                }}
              >
                {progress.completedLessons.includes(selected)
                  ? `✓ ${t('lessonDone')}`
                  : selected > unlockedIndex
                  ? `🔒 ${tr(`Reach ${THRESHOLDS[selected]} XP to Complete`, `مکمل کرنے کے لیے ${THRESHOLDS[selected]} ایکس پی حاصل کریں`, `اجمع ${THRESHOLDS[selected]} نقطة لإكمال الدرس`)}`
                  : `${t('completeLesson')} ⭐`}
              </button>
              {progress.completedLessons.includes(selected) && (
                <p className="mt-2 text-center text-sm text-[var(--muted)]">{t('lessonOnce')}</p>
              )}
            </article>

            <aside className="card p-5">
              <h3 className="text-xl font-black">⚡ {t('quick')}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{t('quickDesc')}</p>
              <div className="mt-4 grid gap-2">
                <button className="big-btn" onClick={() => onJumpToPlay('quiz')}>
                  {t('startQuiz')} 🧠
                </button>
                <button className="ghost" onClick={() => onJumpToPlay('memory')}>
                  {t('playMemory')} 🃏
                </button>
                <button className="ghost" onClick={() => onJumpToPlay('matching')}>
                  {t('playMatching')} 🔗
                </button>
                <button className="ghost" onClick={() => onJumpToPlay('reaction')}>
                  {t('playReaction')} ⚡
                </button>
              </div>
              <div className="mt-5 rounded-2xl bg-[var(--surface2)] p-4 border-2 border-dashed border-[var(--line)]">
                <div className="font-black">📅 {t('dailyFocus')}</div>
                <p className="mt-1 text-sm leading-relaxed">{t('dailyFocusTxt')}</p>
              </div>
              <div className="mt-3 rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm tabular-nums">
                <b>{t('completed')}</b> {progress.completedLessons.length} / 15 ⭐
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Poomsae Viewer */}
      {subTab === 'poomsae' && (
        <article className="card mx-auto max-w-[760px] p-5">
          <h2 className="text-2xl font-black">🥋 {t('poomTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('poomDesc')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="ghost !py-2" onClick={() => setFollowMe((f) => !f)}>
              {followMe ? `⏸️ ${t('pauseFollow')}` : `▶️ ${t('follow')}`}
            </button>
            <button
              className="ghost !py-2"
              onClick={() => {
                setPoomsaeStep(0);
                onCheer(t('canDo'));
              }}
            >
              🔄 {t('startAgain')}
            </button>
            <button
              className="ghost !py-2"
              onClick={() =>
                speaking
                  ? onStopSpeak()
                  : onSpeak(
                      `${pick(POOMSAE[poomsaeStep].tech, lang)}. ${pick(POOMSAE[poomsaeStep].stance, lang)}`,
                      `poomsae-step-${poomsaeStep}`,
                      'poomsae'
                    )
              }
            >
              🔊 {speaking ? t('stop') : t('listen')}
            </button>
          </div>

          <div className="mt-5 rounded-3xl bg-[var(--surface2)] border-[3px] border-[var(--line)] p-6 text-center">
            <div className="poom-char">{POOMSAE[poomsaeStep].emoji}</div>
            <div className="mt-1 text-6xl">{POOMSAE[poomsaeStep].arrow}</div>
            <div className="mt-2 text-sm font-black uppercase tracking-widest">
              {t('stepOf')} {POOMSAE[poomsaeStep].step} {t('of')} {POOMSAE.length}
            </div>
            <div className="mt-2 text-2xl font-black">{pick(POOMSAE[poomsaeStep].tech, lang)}</div>
            <div className="mt-1 font-bold text-[var(--muted)]">
              {pick(POOMSAE[poomsaeStep].stance, lang)} · {POOMSAE[poomsaeStep].ko}
            </div>
            <div className="mt-2 text-sm">
              {t('copy')} {progress.avatar}!
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {POOMSAE.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to poomsae step ${i + 1}`}
                onClick={() => setPoomsaeStep(i)}
                className="h-4 w-9 rounded-full min-h-[24px]"
                style={{ background: i === poomsaeStep ? 'var(--primary)' : 'var(--line)' }}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="ghost" disabled={poomsaeStep === 0} onClick={() => setPoomsaeStep((s) => s - 1)}>
              ← {t('prev')}
            </button>
            <button
              className="big-btn"
              disabled={poomsaeStep === POOMSAE.length - 1}
              onClick={() => setPoomsaeStep((s) => s + 1)}
            >
              {t('next')} →
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-[var(--muted)]">{t('poomHint')} 🛡️</p>
        </article>
      )}

      {/* Movies Theater */}
      {subTab === 'movies' && (
        <article className="card mx-auto max-w-[860px] p-5">
          <h2 className="text-2xl font-black">🎬 {t('watchMovies')}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('guideDesc')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {MOVIES.map((m, i) => (
              <button
                key={i}
                onClick={() => {
                  setMovieIdx(i);
                  setMovieStep(0);
                  setMoviePlaying(false);
                  onBeep(560, 0.07);
                }}
                aria-pressed={movieIdx === i}
                className="rounded-full px-4 py-3 text-sm font-black min-h-[48px]"
                style={{
                  background: movieIdx === i ? 'var(--primary)' : 'var(--surface2)',
                  color: movieIdx === i ? '#fff' : 'var(--text)',
                  border: '3px solid var(--line)',
                }}
              >
                {m.emoji} {pick(m.title, lang)} {progress.movieWatched.includes(i) ? '✓' : ''}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="ghost yellow" onClick={() => setTheaterLarge((v) => !v)}>
              ⛶ {theaterLarge ? tr('Large Stage: ON', 'بڑا اسٹیج: آن', 'مسرح كبير: تشغيل') : tr('Large Stage: OFF', 'بڑا اسٹیج: آف', 'مسرح كبير: إيقاف')}
            </button>
            <span className="self-center rounded-full bg-white px-3 py-2 text-sm font-black text-[#0F172A] border-[3px] border-[#0F172A] tabular-nums">
              {t('stepOf')} {movieStep + 1} {t('of')} {currentMovie.steps.length}
            </span>
          </div>

          <div
            className={`movie-stage mt-4 p-3 ${theaterLarge ? 'large' : ''}`}
            style={movieIdx === 1 ? { background: 'linear-gradient(180deg,#BFDBFE,#FEF9C3 55%,#FCA5A5)' } : {}}
          >
            <div className="crowd text-center text-2xl" aria-hidden="true">
              <span>👏</span><span>🎉</span><span>👏</span><span>⭐</span><span>👏</span><span>🎉</span><span>👏</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-black text-[#0F172A]">{tr('Progress', 'ترقی', 'التقدم')}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-white border-[3px] border-[#0F172A]">
                <div
                  className="h-full bg-[#1D4ED8]"
                  style={{ width: `${((movieStep + 1) / currentMovie.steps.length) * 100}%` }}
                />
              </div>
              <span className="text-sm font-black text-[#0F172A] tabular-nums">
                {Math.round(((movieStep + 1) / currentMovie.steps.length) * 100)}%
              </span>
            </div>

            {movieIdx === 0 && (
              <div className="relative mt-2 flex flex-col items-center">
                <div className="rounded-full bg-white px-4 py-2 text-center font-black text-[#0F172A] border-[3px] border-[#0F172A]">
                  🏯 {tr('Bright Dojo — Taegeuk Il Jang', 'روشن دوجانگ — تائگک ال جانگ', 'دوجانغ مشرق — تايغوك إل جانغ')}
                </div>
                <div className="mt-1 text-6xl font-black text-[#0F172A]">
                  {['←', '←', '→', '↓', '↑', '↖', '→', '←'][Math.min(movieStep, 7)]}
                </div>
                <div className={`cartoon-kid ${moviePlaying ? 'bouncing' : ''}`}>
                  <div className="ck-head">
                    <span className="ck-hair" />😊
                  </div>
                  <div className="ck-body">
                    🥋<span className="ck-belt" style={{ background: BELT_COLORS[selected] || '#fff' }} />
                  </div>
                  <div className="ck-legs">
                    <span className="ck-leg" />
                    <span className="ck-leg" />
                  </div>
                </div>
                {moviePlaying && <div className="leg-arc" aria-hidden="true" />}
              </div>
            )}

            {movieIdx === 1 && (
              <div className="relative mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-sm font-black text-[#0F172A]">
                      <span>🔵 {tr('Blue', 'نیلا', 'أزرق')}</span>
                      <span>80 ❤️</span>
                    </div>
                    <div className="hp-bar mt-1">
                      <div className="hp-fill" style={{ width: `${movieStep >= 4 ? 80 : 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm font-black text-[#0F172A]">
                      <span>🔴 {tr('Red', 'سرخ', 'أحمر')}</span>
                      <span>75 ❤️</span>
                    </div>
                    <div className="hp-bar mt-1">
                      <div className="hp-fill" style={{ width: `${movieStep >= 4 ? 75 : 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="relative flex items-end justify-between px-2 pt-2">
                  <div className="text-center">
                    <div className="cartoon-kid bouncing" style={{ width: 130 }}>
                      <div className="ck-head">😤</div>
                      <div className="ck-body">
                        🥋<span className="ck-belt" style={{ background: '#2563EB' }} />
                      </div>
                      <div className="ck-legs">
                        <span className="ck-leg" />
                        <span className="ck-leg" />
                      </div>
                    </div>
                    <div className="font-black text-[#0F172A]">🔵 BLUE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl">🧑‍⚖️</div>
                    <div className="text-xs font-black text-[#0F172A]">{tr('Referee', 'ریفری', 'الحكم')}</div>
                  </div>
                  <div className="text-center">
                    <div className="cartoon-kid bouncing" style={{ width: 130 }}>
                      <div className="ck-head">😡</div>
                      <div className="ck-body">
                        🥋<span className="ck-belt" style={{ background: '#DC2626' }} />
                      </div>
                      <div className="ck-legs">
                        <span className="ck-leg" />
                        <span className="ck-leg" />
                      </div>
                    </div>
                    <div className="font-black text-[#0F172A]">🔴 RED</div>
                  </div>
                </div>
                {(movieStep === 4 || movieStep === 6) && (
                  <div className="mt-2 text-center">
                    <span className="point-pop">⭐ POINT! ⭐</span>
                  </div>
                )}
              </div>
            )}

            {movieIdx === 2 && (
              <div className="relative mt-2 text-center">
                <div className="mx-auto flex max-w-[520px] flex-wrap justify-center gap-3">
                  {['🦶', '🌀', '🦵', '🪓'].map((e, i) => (
                    <div key={i} className="rounded-2xl bg-white border-[3px] border-[#0F172A] px-3 py-2 text-center">
                      <div className="text-5xl">{e}</div>
                      <div className="text-xs font-black text-[#0F172A]">
                        {[
                          tr('Front Kick', 'فرنٹ کک', 'ركلة أمامية'),
                          tr('Roundhouse', 'راؤنڈ ہاؤس', 'دائرية'),
                          tr('Side Kick', 'سائیڈ کک', 'جانبية'),
                          tr('Axe Kick', 'ایکس کک', 'فأس'),
                        ][i]}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mx-auto mt-3 w-fit">
                  <div className="leg-arc" />
                </div>
                <div className="mt-1 text-7xl">{currentMovie.steps[movieStep].actor}</div>
              </div>
            )}

            {movieIdx === 3 && (
              <div className="relative mt-2 flex items-end justify-center gap-6">
                <div className="text-center">
                  <div className="cartoon-kid bouncing">
                    <div className="ck-head">😊</div>
                    <div className="ck-body">
                      🦸<span className="ck-belt" style={{ background: '#FDE047' }} />
                    </div>
                    <div className="ck-legs">
                      <span className="ck-leg" />
                      <span className="ck-leg" />
                    </div>
                  </div>
                  <div className="font-black text-[#0F172A]">{tr('Hero', 'ہیرو', 'البطل')}</div>
                </div>
                <div className="text-6xl pb-8">{currentMovie.steps[movieStep].actor}</div>
                <div className="pb-8 text-5xl">🤝</div>
              </div>
            )}

            <div className="subtitle-bar mt-3">
              <span className="text-xs uppercase tracking-widest">{t('subtitles')}</span>
              <div>{pick(currentMovie.steps[movieStep].text, lang)}</div>
              <div className="mt-1 text-sm">
                {t('stepOf')} {movieStep + 1} {t('of')} {currentMovie.steps.length} · 🗣️{' '}
                {tr('Voice narration ready offline', 'آف لائن آواز دستیاب', 'السرد الصوتي متاح دون اتصال')}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              className="big-btn flex items-center gap-2"
              onClick={() => {
                setMoviePlaying((p) => !p);
                if (!moviePlaying) onSpeakKid(pick(currentMovie.steps[movieStep].text, lang), `movie-track-${movieIdx}`);
              }}
            >
              {moviePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{moviePlaying ? t('pauseMovie') : t('playMovie')}</span>
            </button>
            <button
              className="ghost flex items-center gap-2"
              onClick={() => onSpeakKid(pick(currentMovie.steps[movieStep].text, lang), `movie-track-${movieIdx}`)}
            >
              <Volume2 className="w-4 h-4" />
              <span>{t('narrate')}</span>
            </button>
            <button className="ghost" onClick={() => setMovieStep((s) => Math.max(0, s - 1))}>
              ← {t('prev')}
            </button>
            <button className="ghost" onClick={() => setMovieStep((s) => Math.min(currentMovie.steps.length - 1, s + 1))}>
              {t('next')} →
            </button>
            <button
              className="ghost flex items-center gap-2"
              onClick={() => {
                setMovieStep(0);
                setMoviePlaying(true);
              }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('watchAgain')}</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm font-black">{t('speedLabel')}:</span>
            {([
              ['slow', t('slowMo')],
              ['normal', t('normalSpeed')],
              ['fast', t('fastSpeed')],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setMovieSpeed(v)}
                aria-pressed={movieSpeed === v}
                className="rounded-full px-3 py-2 text-sm font-black min-h-[44px]"
                style={{
                  background: movieSpeed === v ? '#FDE047' : '#FFFFFF',
                  color: '#0F172A',
                  border: '3px solid #0F172A',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            className="big-btn mt-4 w-full"
            disabled={progress.movieWatched.includes(movieIdx)}
            onClick={() => {
              setProgress((p) => ({
                ...p,
                movieWatched: [...p.movieWatched, movieIdx],
              }));
              onAddXp(30, `${t('movieWatched')} +30 ${t('xp')} 🎬`);
              onCheer(t('awesome'));
            }}
          >
            {progress.movieWatched.includes(movieIdx) ? `✓ ${t('movieWatched')}` : `${t('watchedBonus')} 🎬`}
          </button>
        </article>
      )}

      {/* Coach TV */}
      {subTab === 'coachtv' && (
        <article className="card mx-auto max-w-[860px] p-5">
          <h2 className="text-2xl font-black">📺 {tr('Coach TV', 'کوچ ٹی وی', 'تلفزيون المدرب')}</h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {tr(
              'Watch, listen to step-by-step voice coaching, then copy slowly and safely.',
              'دیکھیں، قدم بہ قدم کوچ کی آواز سنیں، پھر آہستہ اور محفوظ طریقے سے نقل کریں۔',
              'شاهد واستمع إلى التدريب الصوتي خطوة بخطوة، ثم قلّد ببطء وأمان.'
            )}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {COACH_TV.map((m, i) => (
              <button
                key={i}
                onClick={() => {
                  setCoachTvMovie(i);
                  setCoachTvStep(0);
                  setCoachTvPlaying(false);
                  onStopSpeak();
                  onBeep(560, 0.07);
                }}
                aria-pressed={coachTvMovie === i}
                className="rounded-full px-4 py-3 text-sm font-black min-h-[48px]"
                style={{
                  background: coachTvMovie === i ? 'var(--primary)' : 'var(--surface2)',
                  color: coachTvMovie === i ? '#fff' : 'var(--text)',
                  border: '3px solid var(--line)',
                }}
              >
                {m.emoji} {pick(m.title, lang)}
              </button>
            ))}
          </div>

          <div className="movie-stage large mt-4 p-3">
            <div className="crowd text-center text-2xl" aria-hidden="true">
              <span>👏</span><span>🎉</span><span>👏</span><span>⭐</span><span>👏</span><span>🎉</span><span>👏</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-black text-[#0F172A]">{tr('Progress', 'ترقی', 'التقدم')}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-white border-[3px] border-[#0F172A]">
                <div
                  className="h-full bg-[#1D4ED8]"
                  style={{ width: `${((coachTvStep + 1) / coachTvCurrent.steps.length) * 100}%` }}
                />
              </div>
              <span className="text-sm font-black text-[#0F172A] tabular-nums">
                {coachTvStep + 1} / {coachTvCurrent.steps.length}
              </span>
            </div>

            <div className="relative mt-3 flex flex-col items-center">
              <div className="rounded-full bg-white px-4 py-2 text-center font-black text-[#0F172A] border-[3px] border-[#0F172A]">
                {pick(coachTvCurrent.title, lang)} · {pick(coachTvCurrentStep.badge, lang)}
              </div>
              <div className="mt-2 text-6xl font-black text-[#0F172A]">{coachTvCurrentStep.arrow}</div>
              <div className={`cartoon-kid ${coachTvPlaying ? 'bouncing' : ''}`}>
                <div className="ck-head">
                  <span className="ck-hair" />😊
                </div>
                <div className="ck-body">
                  🥋
                  {coachTvCurrentStep.hogu && (
                    <span className="coach-hogu" aria-label="Hogu chest protector">
                      🛡️
                    </span>
                  )}
                  <span className="ck-belt" style={{ background: coachTvBeltColor }} />
                </div>
                <div className="ck-legs">
                  <span className="ck-leg" />
                  <span className="ck-leg" />
                </div>
              </div>
              {coachTvCurrentStep.kick && (
                <div className="coach-kick-wrap" aria-hidden="true">
                  <div className="leg-arc" />
                  <div className="text-6xl">🦶</div>
                </div>
              )}
              <div className="mt-2 w-full max-w-[560px] rounded-2xl bg-white border-[3px] border-[#0F172A] p-3 text-center text-[#0F172A]">
                <div className="text-sm font-black uppercase tracking-widest">
                  {t('stepOf')} {coachTvStep + 1} {t('of')} {coachTvCurrent.steps.length} · 🏅{' '}
                  {pick(coachTvCurrentStep.badge, lang)}
                </div>
                <div className="mt-1 text-xl font-black">
                  {tr('Stance', 'پوزیشن', 'الوقفة')}: {pick(coachTvCurrentStep.stance, lang)}
                </div>
                <div className="text-xl font-black">
                  {tr('Technique', 'تکنیک', 'التقنية')}: {pick(coachTvCurrentStep.tech, lang)}
                </div>
              </div>
            </div>

            <div className="subtitle-bar mt-3">
              <span className="text-xs uppercase tracking-widest">{t('subtitles')}</span>
              <div>{pick(coachTvCurrentStep.subtitle, lang)}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border-[3px] border-[#0F172A] bg-[#FEF08A] p-4 text-[#0F172A]">
            <div className="flex items-start gap-3">
              <span className="text-5xl">🧑‍🏫</span>
              <div className="min-w-0 flex-1 space-y-2 text-[15px] font-bold">
                <div className="text-lg font-black">{tr('Coach Panel', 'کوچ پینل', 'لوحة المدرب')}</div>
                <p>
                  <b>1) {tr('Stance:', 'پوزیشن:', 'الوقفة:')}</b> {pick(coachTvCurrentStep.stanceHow, lang)}
                </p>
                <p>
                  <b>2) {tr('Move:', 'چال:', 'الحركة:')}</b> {pick(coachTvCurrentStep.moveHow, lang)}
                </p>
                <p>
                  <b>3) {tr('Safety Tip:', 'حفاظتی مشورہ:', 'نصيحة السلامة:')}</b>{' '}
                  {pick(coachTvCurrentStep.mistake, lang)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              className="big-btn"
              onClick={() => {
                setCoachTvPlaying((p) => !p);
                if (!coachTvPlaying) {
                  onSpeakCoach(
                    `${pick(coachTvCurrentStep.subtitle, lang)} ${pick(coachTvCurrentStep.stanceHow, lang)} ${pick(coachTvCurrentStep.moveHow, lang)}`,
                    `coachtv-track-${coachTvMovie}`
                  );
                }
              }}
            >
              {coachTvPlaying ? `⏸️ ${t('pauseMovie')}` : `▶️ ${t('playMovie')}`}
            </button>
            <button
              className="ghost yellow"
              onClick={() =>
                onSpeakCoach(
                  `${pick(coachTvCurrentStep.subtitle, lang)} ${pick(coachTvCurrentStep.stanceHow, lang)} ${pick(coachTvCurrentStep.moveHow, lang)} ${pick(coachTvCurrentStep.mistake, lang)}`,
                  `coachtv-track-${coachTvMovie}`
                )
              }
            >
              🔊 {tr('Coach Voice', 'کوچ کی آواز', 'صوت المدرب')}
            </button>
            <button
              className="ghost"
              disabled={coachTvStep === 0}
              onClick={() => {
                setCoachTvStep((s) => Math.max(0, s - 1));
                setCoachTvPlaying(false);
              }}
            >
              ← {t('prev')}
            </button>
            <button
              className="big-btn"
              disabled={coachTvStep === coachTvCurrent.steps.length - 1}
              onClick={() => {
                setCoachTvStep((s) => Math.min(coachTvCurrent.steps.length - 1, s + 1));
                setCoachTvPlaying(false);
              }}
            >
              {t('next')} →
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm font-black">{t('speedLabel')}:</span>
            {([
              ['slow', t('slowMo')],
              ['normal', t('normalSpeed')],
              ['fast', t('fastSpeed')],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setCoachTvSpeed(v)}
                aria-pressed={coachTvSpeed === v}
                className="rounded-full px-3 py-2 text-sm font-black min-h-[44px]"
                style={{
                  background: coachTvSpeed === v ? '#FDE047' : '#FFFFFF',
                  color: '#0F172A',
                  border: '3px solid #0F172A',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </article>
      )}

      {/* Complete Color-Belt-to-Dan Encyclopedia & Kiki Soundboard */}
      {subTab === 'encyclopedia' && (
        <div className="space-y-4">
          {/* Kiki Encyclopedia Header */}
          <article className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="kiki-bounce inline-block text-5xl" aria-hidden="true">🎤</span>
                <div>
                  <h2 className="text-[clamp(1.35rem,5vw,1.9rem)] font-black leading-tight">
                    📖 {tr("Kiki's Complete Color Belt to 9th Dan Guide", 'کیکی کی مکمل کلر بیلٹ تا نواں ڈان گائیڈ', 'دليل كيكي الكامل من الحزام الملون إلى الدان التاسع')}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                    {tr(
                      'Tap any belt, Korean number, Tenet, or command to hear Coach Kiki explain it — works offline!',
                      'کسی بھی بیلٹ، کورین گنتی، اصول یا کمانڈ کو دبا کر کوچ کیکی کی آواز سنیں — آف لائن بھی!',
                      'اضغط على أي حزام أو رقم كوري أو مبدأ أو أمر لتسمع المدربة كيكي تشرحه — يعمل دون اتصال!'
                    )}
                  </p>
                </div>
              </div>
              <button
                className="big-btn yellow !py-2 !px-4 text-sm flex items-center gap-2"
                onClick={() => {
                  const welcome = tr(
                    'Welcome to the Taekwondo Encyclopedia! From White Belt to 9th Dan, every belt teaches kindness, balance, and courage!',
                    'تائیکوانڈو انسائیکلوپیڈیا میں خوش آمدید! سفید بیلٹ سے نویں ڈان تک ہر بیلٹ مہربانی، توازن اور ہمت سکھاتا ہے!',
                    'مرحباً بك في موسوعة التايكواندو! من الحزام الأبيض حتى الدان التاسع، كل حزام يعلّم اللطف والتوازن والشجاعة!'
                  );
                  if (speaking) onStopSpeak();
                  else onSpeakKid(welcome, 'kiki-welcome');
                }}
              >
                {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{speaking ? t('stop') : tr('Hear Kiki Welcome', 'کیکی کا تعارف سنیں', 'اسمع ترحيب كيكي')}</span>
              </button>
            </div>

            {/* Rank Filter Buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {([
                ['all', tr('🌈 All 15 Ranks', '🌈 تمام 15 درجات', '🌈 كل الرتب (15)')],
                ['color', tr('🎨 Color Belts (White–Black)', '🎨 کلر بیلٹ (سفید–کالا)', '🎨 الأحزمة الملونة')],
                ['dan', tr('⭐ Dan Masters (1st–9th Dan)', '⭐ ڈان ماسٹرز (1–9 ڈان)', '⭐ معلمو الدان (1–9)')],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setGuideFilter(id);
                    onBeep(560, 0.06);
                  }}
                  aria-pressed={guideFilter === id}
                  className={`tab-btn ${guideFilter === id ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </article>

          {/* All Belts & Dan Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {BELT_DEEP_GUIDES.filter((g) =>
              guideFilter === 'color' ? g.beltIndex <= 5 : guideFilter === 'dan' ? g.beltIndex >= 6 : true
            ).map((g) => {
              const i = g.beltIndex;
              const dan = i >= 5 ? i - 5 : 0;
              const know = KNOWLEDGE[i];
              const rankTitle =
                lang === 'en' && progress.settings.beltNames[i]
                  ? progress.settings.beltNames[i]
                  : pick(DEFAULT_NAMES[i], lang);
              const voiceScript = `${rankTitle}. ${pick(g.koreanRank, lang)}. ${pick(g.kikiIntro, lang)} ${pick(g.symbolism, lang)} ${pick(g.poomsaeMeaning, lang)} ${pick(g.spiritQuote, lang)}`;
              return (
                <article key={i} className="card pop p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
                          {pick(g.koreanRank, lang)} · {THRESHOLDS[i]} {t('xp')}
                        </span>
                        <h3 className="text-xl font-black mt-0.5">
                          {BELT_FRIENDS[i].animal} {rankTitle} {i >= 5 ? '' : t('belt')}
                        </h3>
                      </div>
                      <button
                        className="ghost !py-1.5 !px-3 text-xs min-h-[44px] flex items-center gap-1.5 shrink-0"
                        onClick={() => onSpeakKid(voiceScript, `kiki-guide-${i}`)}
                        aria-label={`${t('listen')} ${rankTitle}`}
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{tr('Hear Kiki', 'کیکی کو سنیں', 'اسمع كيكي')}</span>
                      </button>
                    </div>

                    <div className="mt-2">
                      <BeltVisual color={BELT_COLORS[i]} dan={dan} />
                    </div>

                    <p
                      className="mt-3 rounded-2xl border-2 p-2.5 text-sm font-bold leading-relaxed"
                      style={{ background: 'var(--surface2)', borderColor: 'var(--line)' }}
                    >
                      🎤 “{pick(g.kikiIntro, lang)}”
                    </p>

                    <div className="mt-2.5 space-y-1.5 text-sm">
                      <p>
                        <b>🌱 {tr('Meaning:', 'مطلب:', 'المعنى:')}</b> {pick(g.symbolism, lang)}
                      </p>
                      <p>
                        <b>🌀 {tr('Poomsae:', 'پومسے:', 'البومساي:')}</b> {pick(g.poomsaeMeaning, lang)} ({g.moveCount}{' '}
                        {tr('moves', 'حرکات', 'حركة')})
                      </p>
                      <p>
                        <b>🥋 {tr('Key Moves:', 'اہم چالیں:', 'حركات أساسية:')}</b>{' '}
                        {know.tech.map((tc) => `${tc[0]} ${pick(tc[1], lang).split('—')[0].trim()}`).join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="big-btn !py-2 !px-4 text-xs sm:text-sm flex-1"
                      onClick={() => {
                        setSelected(i);
                        setSubTab('belts');
                        setKikiSpeechBubble(pick(g.kikiIntro, lang));
                        onSpeakKid(pick(g.kikiIntro, lang), `kiki-guide-${i}`);
                        onBeep(620, 0.08);
                      }}
                    >
                      📚 {tr('Open Interactive Lesson', 'مکمل سبق کھولیں', 'افتح الدرس الكامل')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Kiki's Korean Counting 1-10 Soundboard */}
          <article className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xl font-black">
                  🇰🇷 {tr('Count 1–10 in Korean with Kiki!', 'کیکی کے ساتھ کورین میں 1 سے 10 گنیں!', 'عدّ من 1 إلى 10 بالكورية مع كيكي!')}
                </h3>
                <p className="text-sm font-bold text-[var(--muted)]">
                  {tr('Tap any number to hear Kiki count and shout!', 'کسی بھی نمبر کو دبائیں اور کیکی کے ساتھ گنیں!', 'اضغط على أي رقم لتعد مع كيكي!')}
                </p>
              </div>
              <button
                className="ghost !py-2 !px-4 text-sm"
                onClick={() => {
                  const full = KOREAN_COUNTING.map((c) => `${c.korean}!`).join(' ');
                  onSpeakKid(full, 'kiki-count-9');
                }}
              >
                🔊 {tr('Count All 1–10!', 'سب 1–10 سنیں!', 'اسمع العد 1–10!')}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {KOREAN_COUNTING.map((c, idx) => (
                <button
                  key={c.num}
                  onClick={() => {
                    onBeep(440 + idx * 45, 0.09, 'sine');
                    onSpeakKid(`${c.korean}! ${pick(c.word, lang)}`, `kiki-count-${idx}`);
                  }}
                  className="ghost !rounded-2xl !p-3 text-center flex flex-col items-center justify-center min-h-[82px]"
                >
                  <span className="text-xl font-black tabular-nums">
                    {c.num}. {c.korean}
                  </span>
                  <span className="text-xs font-bold opacity-80">{pick(c.word, lang)}</span>
                </button>
              ))}
            </div>
          </article>

          {/* The 5 Tenets of Taekwondo */}
          <article className="card p-5">
            <h3 className="text-xl font-black">
              💛 {tr('The 5 Tenets of Taekwondo (Oh-Gye)', 'تائیکوانڈو کے 5 سنہری اصول (اوہ گیے)', 'المبادئ الخمسة للتايكواندو')}
            </h3>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {tr('Tap any Tenet to hear Coach Kiki explain how champions live every day!', 'کسی بھی اصول کو دبائیں اور کوچ کیکی سے سنیں!', 'اضغط على أي مبدأ لتسمع شرح المدربة كيكي!')}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TAEKWONDO_TENETS.map((ten, idx) => (
                <button
                  key={ten.korean}
                  onClick={() => {
                    onBeep(600, 0.08);
                    onSpeakKid(`${ten.korean}. ${pick(ten.kikiLine, lang)} ${pick(ten.meaning, lang)}`, `kiki-tenet-${idx}`);
                  }}
                  className="card p-4 text-left flex flex-col justify-between min-h-[140px]"
                  style={{ background: 'var(--surface2)' }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-3xl">{ten.emoji}</span>
                      <span className="text-xs font-black">🔊 {t('listen')}</span>
                    </div>
                    <div className="mt-2 font-black text-base">
                      {pick(ten.title, lang)} — {ten.korean}
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{pick(ten.meaning, lang)}</p>
                  </div>
                </button>
              ))}
            </div>
          </article>

          {/* 8 Official Dojang Commands */}
          <article className="card p-5">
            <h3 className="text-xl font-black">
              📣 {tr('Dojang Korean Commands with Kiki', 'کیکی کے ساتھ دوجانگ کمانڈز', 'أوامر الدوجانغ الكورية مع كيكي')}
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {DOJANG_COMMANDS.map((cmd, idx) => (
                <button
                  key={cmd.korean}
                  onClick={() => {
                    onBeep(660, 0.08);
                    onSpeakKid(`${cmd.korean} ${pick(cmd.title, lang)} ${pick(cmd.action, lang)}`, `kiki-cmd-${idx}`);
                  }}
                  className="card p-3.5 text-left min-h-[115px]"
                  style={{ background: 'var(--surface2)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cmd.emoji}</span>
                    <span className="text-xs font-black">🔊</span>
                  </div>
                  <div className="mt-1.5 font-black">
                    {cmd.korean} · {pick(cmd.title, lang)}
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)] leading-relaxed">{pick(cmd.action, lang)}</p>
                </button>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  );
};
