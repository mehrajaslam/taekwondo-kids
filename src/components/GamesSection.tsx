import React, { useEffect, useMemo, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import {
  DAN_SCENARIOS,
  DEFAULT_NAMES,
  MATCH_PAIRS,
  MEMORY_PAIRS,
  pick,
  QUIZ,
  shuffle,
} from '../data/taekwondoData';
import { Lang, Progress } from '../types/taekwondo';

interface GamesSectionProps {
  initialGame?: 'quiz' | 'memory' | 'matching' | 'reaction' | 'dan';
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
  selected: number;
  unlockedIndex: number;
  lang: Lang;
  speaking: boolean;
  mascotText: string;
  onSpeak: (text: string, exerciseId?: string, category?: 'lesson' | 'move' | 'quiz') => void;
  onStopSpeak: () => void;
  onBeep: (freq?: number, dur?: number, type?: OscillatorType) => void;
  onHappy: () => void;
  onAddXp: (n: number, msg?: string) => void;
  onLoseLife: () => void;
  onCheer: (msg: string) => void;
  onEncourage: (msg: string) => void;
  onKidCheer: () => void;
  t: (k: string) => string;
}

export const GamesSection: React.FC<GamesSectionProps> = ({
  initialGame = 'quiz',
  progress,
  setProgress,
  selected,
  unlockedIndex,
  lang,
  speaking,
  mascotText,
  onSpeak,
  onStopSpeak,
  onBeep,
  onHappy,
  onAddXp,
  onLoseLife,
  onCheer,
  onEncourage,
  onKidCheer,
  t,
}) => {
  const [gameTab, setGameTab] = useState<'quiz' | 'memory' | 'matching' | 'reaction' | 'dan'>(initialGame);
  const [quiz, setQuiz] = useState<any>(null);
  const [quizTime, setQuizTime] = useState(30);
  const [quizStars, setQuizStars] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [memory, setMemory] = useState<any[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMatched, setMemoryMatched] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryTime, setMemoryTime] = useState(0);
  const [memoryStarted, setMemoryStarted] = useState(false);

  const [matchLeft, setMatchLeft] = useState<string | null>(null);
  const [matchDone, setMatchDone] = useState<string[]>([]);
  const [matchMsg, setMatchMsg] = useState('');
  const matchLeftOrder = useMemo(() => shuffle(MATCH_PAIRS), [matchDone.length === 0]);
  const matchRightOrder = useMemo(() => shuffle(MATCH_PAIRS), [matchDone.length === 0]);

  const [reaction, setReaction] = useState({
    active: false,
    time: 60,
    score: 0,
    target: 'Kick',
    round: 0,
    combo: 0,
  });
  const [reactionPops, setReactionPops] = useState<{ id: number; text: string; left: string }[]>([]);

  const [danIdx, setDanIdx] = useState(0);
  const [danFeedback, setDanFeedback] = useState('');

  useEffect(() => {
    setGameTab(initialGame);
    if (initialGame === 'quiz' && !quiz) startQuiz();
  }, [initialGame]);

  const displayBeltName =
    lang === 'en'
      ? progress.settings.beltNames[selected] || pick(DEFAULT_NAMES[selected], lang)
      : pick(DEFAULT_NAMES[selected], lang);
  const isDanUnlocked = unlockedIndex >= 5;

  function startQuiz() {
    const pool = QUIZ[selected] || QUIZ[0];
    const q = pool[Math.floor(Math.random() * pool.length)];
    const answers = shuffle(q.a.map((txt) => ({ text: pick(txt, lang), correct: txt === q.a[0] })));
    setQuiz({ q: pick(q.q, lang), answers, picked: null, start: Date.now() });
    setQuizTime(30);
    setQuizStars(0);
    onCheer(t('canDo'));
  }

  useEffect(() => {
    if (!quiz || quiz.picked !== null) return;
    const tt = setInterval(
      () =>
        setQuizTime((s) => {
          if (s <= 1) {
            clearInterval(tt);
            return 0;
          }
          return s - 1;
        }),
      1000
    );
    return () => clearInterval(tt);
  }, [quiz]);

  useEffect(() => {
    if (quizTime === 0 && quiz && quiz.picked === null) {
      setQuiz({ ...quiz, picked: -1 });
      onLoseLife();
    }
  }, [quizTime]);

  useEffect(() => {
    if (!memoryStarted) return;
    const tt = setInterval(() => setMemoryTime((s) => s + 1), 1000);
    return () => clearInterval(tt);
  }, [memoryStarted]);

  function startMemory() {
    const cards = shuffle([
      ...MEMORY_PAIRS.flatMap((p, i) => [
        { id: i * 2, pair: i, text: p.ko, type: 'KO' },
        { id: i * 2 + 1, pair: i, text: pick(p.en, lang), type: 'EN' },
      ]),
    ]);
    setMemory(cards);
    setMemoryFlipped([]);
    setMemoryMatched([]);
    setMemoryMoves(0);
    setMemoryTime(0);
    setMemoryStarted(true);
    onCheer(t('canDo'));
  }

  function flipMemory(card: any) {
    if (memoryFlipped.includes(card.id) || memoryMatched.includes(card.id) || memoryFlipped.length >= 2) return;
    onBeep(520, 0.07);
    onSpeak(card.text, `belt-0-move-0`, 'move');
    const next = [...memoryFlipped, card.id];
    setMemoryFlipped(next);
    if (next.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [a, b] = next.map((id) => memory.find((c) => c.id === id));
      if (a.pair === b.pair) {
        setTimeout(() => {
          setMemoryMatched((m) => [...m, a.id, b.id]);
          setMemoryFlipped([]);
          onCheer(t('awesome'));
          if (memoryMatched.length + 2 === 8) {
            setMemoryStarted(false);
            onAddXp(100, t('allMatched'));
          }
        }, 350);
      } else {
        setTimeout(() => setMemoryFlipped([]), 650);
      }
    }
  }

  function startReaction() {
    const first = ['Kick', 'Block', 'Punch', 'Dodge'][Math.floor(Math.random() * 4)];
    setReaction({ active: true, time: 60, score: 0, target: first, round: 1, combo: 0 });
    setReactionPops([]);
    onSpeak(`${t('do')} ${first}!`, 'belt-0-move-0', 'move');
  }

  useEffect(() => {
    if (!reaction.active) return;
    const tt = setInterval(
      () =>
        setReaction((r) => {
          if (r.time <= 1) {
            clearInterval(tt);
            return { ...r, active: false };
          }
          return { ...r, time: r.time - 1 };
        }),
      1000
    );
    return () => clearInterval(tt);
  }, [reaction.active]);

  function reactionTap(action: string) {
    if (!reaction.active) return;
    if (action === reaction.target) {
      const pop = { id: Date.now(), text: '+10!', left: `${18 + Math.random() * 60}%` };
      setReactionPops((p) => [...p, pop]);
      setTimeout(() => setReactionPops((p) => p.filter((x) => x.id !== pop.id)), 1000);
      const nextTarget = ['Kick', 'Block', 'Punch', 'Dodge'][Math.floor(Math.random() * 4)];
      setReaction((r) => ({
        ...r,
        score: r.score + 10,
        combo: r.combo + 1,
        target: nextTarget,
        round: r.round + 1,
      }));
      onHappy();
      onSpeak(nextTarget, 'belt-0-move-1', 'move');
    } else {
      onBeep(180, 0.15, 'sawtooth');
      setReaction((r) => ({ ...r, score: Math.max(0, r.score - 5), combo: 0 }));
      onEncourage(t('tryAgain'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Game Modes">
        {[
          ['quiz', `🧠 ${t('quiz')}`],
          ['memory', `🃏 ${t('memory')}`],
          ['matching', `🔗 ${t('matching')}`],
          ['reaction', `⚡ ${t('reaction')}`],
          ['dan', `⭐ ${t('dan')}`],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={gameTab === id}
            onClick={() => {
              onStopSpeak();
              setGameTab(id as typeof gameTab);
              onBeep(520, 0.06);
              if (id === 'quiz' && !quiz) startQuiz();
            }}
            className={`tab-btn ${gameTab === id ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {gameTab === 'quiz' && (
        <article className="card mx-auto max-w-[760px] p-5">
          <div className="flex flex-wrap justify-between gap-2 font-black tabular-nums">
            <span>🧠 {displayBeltName} {t('quizTitle')}</span>
            <span>⏱ {quizTime}s · ❤️ {progress.lives} · ⭐ {quizStars}</span>
          </div>
          {showConfetti && (
            <div className="relative h-6">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="confetti"
                  style={{ left: `${8 + i * 12}%`, background: ['#facc15', '#2563eb', '#22c55e', '#dc2626'][i % 4] }}
                />
              ))}
            </div>
          )}
          <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[var(--surface2)]">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-1000"
              style={{ width: `${(quizTime / 30) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-center text-sm font-bold">
            {progress.avatar} {mascotText}
          </p>

          {!quiz ? (
            <button className="big-btn mt-4 w-full" onClick={startQuiz}>
              {t('startQuizBtn')} 🚀
            </button>
          ) : (
            <>
              <div className="quiz-question mt-4">{quiz.q}</div>
              <div className="mt-2">
                <button
                  className="ghost !py-2 !px-4 text-sm flex items-center gap-2"
                  onClick={() => (speaking ? onStopSpeak() : onSpeak(quiz.q, `belt-lesson-${selected}`, 'quiz'))}
                >
                  {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{speaking ? t('stop') : t('listen')}</span>
                </button>
              </div>
              <div className="mt-4 grid gap-2">
                {quiz.answers.map((a: any, i: number) => {
                  const picked = quiz.picked !== null;
                  const cls = picked && a.correct ? 'correct' : picked && quiz.picked === i ? 'wrong' : '';
                  return (
                    <button
                      key={i}
                      disabled={picked}
                      className={`answer ${cls}`}
                      onClick={() => {
                        const fast = Date.now() - quiz.start < 10000;
                        const isCorrect = a.correct;
                        setQuiz({ ...quiz, picked: i });
                        if (isCorrect) {
                          onKidCheer();
                          setQuizStars((s) => s + 1);
                          setProgress((p) => ({ ...p, quizWins: p.quizWins + 1 }));
                          setShowConfetti(true);
                          setTimeout(() => setShowConfetti(false), 1200);
                          onAddXp(fast ? 35 : 25, `${t('correctMsg')} +${fast ? 35 : 25} ${t('xp')} ⭐`);
                          onCheer(t('awesome'));
                        } else {
                          onLoseLife();
                        }
                      }}
                    >
                      {String.fromCharCode(65 + i)}. {a.text}
                    </button>
                  );
                })}
              </div>
              {quiz.picked !== null && (
                <div className="mt-4 rounded-xl bg-[var(--surface2)] p-3 font-bold">
                  {quiz.answers[quiz.picked]?.correct ? `🎉 ${t('correctMsg')} ⭐⭐⭐` : `${t('wrongMsg')} 💛`}{' '}
                  {quiz.picked === -1 ? t('timeOut') : ''}
                </div>
              )}
              <button className="big-btn mt-4 w-full" onClick={startQuiz}>
                {t('nextQ')} ➡️
              </button>
              <p className="mt-2 text-center text-xs text-[var(--muted)]">{t('fast')}</p>
            </>
          )}
        </article>
      )}

      {gameTab === 'memory' && (
        <article className="card p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">🃏 {t('memoryTitle')}</h2>
              <p className="text-sm text-[var(--muted)]">{t('memoryDesc')} 🌈</p>
            </div>
            <button className="big-btn !py-2" onClick={startMemory}>
              {memory.length ? `${t('restart')} 🔄` : `${t('startGame')} 🚀`}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-black tabular-nums">
            <span>{t('movesLbl')} {memoryMoves}</span>
            <span>{t('timeLbl')} {memoryTime}s</span>
            <span>{t('pairsLbl')} {memoryMatched.length / 2} / 4 🌟</span>
          </div>
          {memory.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-[var(--surface2)] p-6 text-center font-bold">
              {t('tapStart')} {progress.avatar}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
              {memory.map((c: any) => (
                <button
                  key={c.id}
                  className={`memory-card ${memoryFlipped.includes(c.id) || memoryMatched.includes(c.id) ? 'flipped' : ''}`}
                  aria-label={memoryFlipped.includes(c.id) || memoryMatched.includes(c.id) ? c.text : 'Hidden memory card'}
                  onClick={() => flipMemory(c)}
                >
                  <span className="memory-inner">
                    {memoryFlipped.includes(c.id) || memoryMatched.includes(c.id) ? c.text : '🥋'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {memoryMatched.length === 8 && (
            <div className="mt-4 rounded-2xl bg-emerald-100 p-4 text-center font-black text-emerald-900">
              🏆 {t('allMatched')} 🎉
            </div>
          )}
        </article>
      )}

      {gameTab === 'matching' && (
        <article className="card p-5">
          <h2 className="text-2xl font-black">🔗 {t('matchTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('matchDesc')} 🌈</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              {matchLeftOrder.map((p) => (
                <button
                  key={p.ko}
                  disabled={matchDone.includes(p.ko)}
                  className="answer !text-center"
                  style={{
                    background: matchLeft === p.ko ? 'var(--primary)' : '',
                    color: matchLeft === p.ko ? 'white' : '',
                  }}
                  onClick={() => {
                    setMatchLeft(p.ko);
                    onBeep(520, 0.06);
                    onSpeak(p.ko, 'belt-0-move-0', 'move');
                  }}
                >
                  🔊 {p.ko}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              {matchRightOrder.map((p) => (
                <button
                  key={p.en[0]}
                  disabled={matchDone.includes(p.ko)}
                  className="answer !text-center"
                  onClick={() => {
                    if (!matchLeft) {
                      setMatchMsg(t('chooseFirst'));
                      return;
                    }
                    const found = MATCH_PAIRS.find((x) => x.ko === matchLeft);
                    if (found?.en[0] === p.en[0]) {
                      setMatchDone((d) => [...d, matchLeft!]);
                      onAddXp(15, t('matchMsg'));
                      onCheer(t('perfect'));
                      setMatchMsg(`✓ ${matchLeft} = ${pick(p.en, lang)}`);
                      if (matchDone.length + 1 === 6) onAddXp(25, `${t('matchTitle')} +25 ${t('xp')} 🎉`);
                      onHappy();
                    } else {
                      setMatchMsg(t('notMatch'));
                      onBeep(180, 0.12, 'sawtooth');
                    }
                    setMatchLeft(null);
                  }}
                >
                  {pick(p.en, lang)}
                </button>
              ))}
            </div>
          </div>
          {matchMsg && <p className="mt-3 text-center font-bold">{matchMsg}</p>}
          {matchDone.length === 6 && (
            <div className="mt-3 text-center">
              <button
                className="ghost"
                onClick={() => {
                  setMatchDone([]);
                  setMatchMsg('');
                  setMatchLeft(null);
                }}
              >
                {t('playAgain')} 🔄
              </button>
            </div>
          )}
        </article>
      )}

      {gameTab === 'reaction' && (
        <article className="card relative mx-auto max-w-[760px] overflow-hidden p-5 text-center">
          <h2 className="text-2xl font-black">⚡ {t('reactionTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('reactionDesc')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 font-black tabular-nums">
            <span className="rounded-full bg-[var(--surface2)] px-3 py-1">
              {t('score')} {reaction.score}
            </span>
            <span className="rounded-full bg-[var(--surface2)] px-3 py-1">
              {t('timeLbl')} {reaction.time}s
            </span>
            <span className="rounded-full bg-[var(--surface2)] px-3 py-1">
              {t('round')} {reaction.round}
            </span>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-orange-800">
              🔥 {t('combo')} {reaction.combo} {reaction.combo >= 3 ? t('onFire') : ''}
            </span>
          </div>
          {reactionPops.map((p) => (
            <span key={p.id} className="score-pop text-3xl" style={{ left: p.left, top: 150 }}>
              {p.text}
            </span>
          ))}
          {!reaction.active && reaction.round === 0 && (
            <button className="big-btn mt-6 w-full" onClick={startReaction}>
              {t('startGame')} 🚀
            </button>
          )}
          {reaction.active && (
            <>
              <div className="mx-auto mt-6 grid h-36 w-36 place-items-center rounded-full border-4 border-yellow-300 bg-[var(--surface2)] text-5xl shadow-lg animate-bounce">
                🎯
              </div>
              <div className="mt-3 text-2xl font-black">
                {t('do')} {reaction.target}!
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['Kick', 'Block', 'Punch', 'Dodge'].map((a) => (
                  <button key={a} className="big-btn blue" onClick={() => reactionTap(a)}>
                    {a === 'Kick' ? '🦵' : a === 'Block' ? '🛡️' : a === 'Punch' ? '🥊' : '💨'} {a}
                  </button>
                ))}
              </div>
            </>
          )}
          {!reaction.active && reaction.round > 0 && (
            <>
              <div className="mt-6 text-xl font-black">
                {t('roundDone')} {reaction.score} 🎉
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{t('collect')}</p>
              <button
                className="big-btn mt-4 w-full"
                onClick={() => {
                  onAddXp(Math.floor(reaction.score / 2), `${t('reactionTitle')} +${Math.floor(reaction.score / 2)} ${t('xp')}`);
                  setProgress((p) => ({ ...p, bestReaction: Math.max(p.bestReaction, reaction.score) }));
                  setReaction({ active: false, time: 60, score: 0, target: 'Kick', round: 0, combo: 0 });
                }}
              >
                {t('collect')} 🔄
              </button>
            </>
          )}
        </article>
      )}

      {gameTab === 'dan' && (
        <article className="card mx-auto max-w-[760px] p-5">
          {!isDanUnlocked ? (
            <>
              <h2 className="text-2xl font-black">⭐ {t('danLocked')}</h2>
              <p className="mt-2 leading-relaxed text-[var(--muted)]">
                {t('danLockedTxt')} {progress.xp} {t('xp')}. {progress.avatar}
              </p>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-[var(--surface2)] border-2 border-[var(--line)]">
                <div className="h-full bg-[var(--primary)]" style={{ width: `${Math.min(100, progress.xp / 5)}%` }} />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-black">⭐ {t('danTitle')}</h2>
                <button
                  className="ghost !py-2 !px-3 text-sm"
                  onClick={() =>
                    onSpeak(
                      `${pick(DAN_SCENARIOS[danIdx].title, lang)}. ${pick(DAN_SCENARIOS[danIdx].text, lang)}`,
                      'belt-lesson-5',
                      'lesson'
                    )
                  }
                >
                  🔊 {t('listen')}
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{t('danDesc')}</p>
              <div className="mt-5 rounded-2xl bg-[var(--surface2)] p-5">
                <div className="font-black text-lg">{pick(DAN_SCENARIOS[danIdx].title, lang)}</div>
                <p className="mt-2 leading-relaxed">{pick(DAN_SCENARIOS[danIdx].text, lang)}</p>
                <div className="mt-4 grid gap-2">
                  {DAN_SCENARIOS[danIdx].choices.map((c, i) => (
                    <button
                      key={i}
                      className="answer"
                      onClick={() => {
                        if (i === DAN_SCENARIOS[danIdx].correct) {
                          onAddXp(40, `+40 ${t('xp')} ⭐`);
                          onCheer(t('awesome'));
                          setDanFeedback(`✓ ${pick(DAN_SCENARIOS[danIdx].choices[0], lang)}`);
                        } else {
                          setDanFeedback(t('wrongMsg'));
                          onEncourage(t('tryAgain'));
                        }
                      }}
                    >
                      {pick(c, lang)}
                    </button>
                  ))}
                </div>
                {danFeedback && <p className="mt-3 font-bold">{danFeedback}</p>}
                <div className="mt-4 flex justify-between gap-2">
                  <button
                    className="ghost"
                    onClick={() => {
                      setDanIdx((danIdx + 1) % DAN_SCENARIOS.length);
                      setDanFeedback('');
                    }}
                  >
                    {t('nextScenario')} →
                  </button>
                  <span className="self-center text-sm text-[var(--muted)]">
                    {danIdx + 1} / {DAN_SCENARIOS.length}
                  </span>
                </div>
              </div>
            </>
          )}
        </article>
      )}
    </div>
  );
};
