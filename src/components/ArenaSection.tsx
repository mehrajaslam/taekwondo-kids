import React, { useEffect, useRef, useState } from 'react';
import {
  buildTourneyMatches,
  FIGHT_OPPONENTS,
  KIKI_TIPS,
  pick,
  POOMSAE_CHOICES,
  TOURNEY_AVATARS,
} from '../data/taekwondoData';
import { Lang, Progress, TMatch, TPlayer, Tri } from '../types/taekwondo';

interface ArenaSectionProps {
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
  lang: Lang;
  athleteInput: string;
  setAthleteInput: (val: string) => void;
  onSpeakCoach: (text: string) => void;
  onStopSpeak: () => void;
  onBeep: (freq?: number, dur?: number, type?: OscillatorType) => void;
  onHappy: () => void;
  onAddXp: (n: number, msg?: string) => void;
  onCheer: (msg: string) => void;
  onGoToProgress: () => void;
  t: (k: string) => string;
  tr: (en: string, ur: string, ar: string) => string;
}

const ARENA_PTS: Record<string, number> = { 'Ap Chagi': 1, 'Dollyo Chagi': 2, 'Dwit Chagi': 3, Punch: 1 };
const ARENA_BELT: Record<string, Tri> = {
  'Ap Chagi': ['White Belt', 'سفید بیلٹ', 'الحزام الأبيض'],
  'Dollyo Chagi': ['Green Belt', 'سبز بیلٹ', 'الحزام الأخضر'],
  'Dwit Chagi': ['Red Belt', 'سرخ بیلٹ', 'الحزام الأحمر'],
  Punch: ['White Belt', 'سفید بیلٹ', 'الحزام الأبيض'],
};

type MedalEntry = { avatar: string; names: string[]; score: string; label: Tri };
type PoomsaePerf = {
  matchId: number;
  playerIdx: number;
  step: number;
  phase: 'ready' | 'lit' | 'judges';
  results: ('Perfect' | 'Good' | 'Miss')[];
  litAt: number;
  judges: number[];
  final: number;
};

export const ArenaSection: React.FC<ArenaSectionProps> = ({
  progress,
  setProgress,
  lang,
  athleteInput,
  setAthleteInput,
  onSpeakCoach,
  onStopSpeak,
  onBeep,
  onHappy,
  onAddXp,
  onCheer,
  onGoToProgress,
  t,
  tr,
}) => {
  const [arenaTab, setArenaTab] = useState<'fight' | 'tournament'>('fight');
  const [fightRound, setFightRound] = useState(0);
  const [fight, setFight] = useState({
    active: false,
    phase: 'idle' as 'idle' | 'fighting' | 'between' | 'finished',
    demo: false,
    round: 1,
    time: 60,
    blue: 0,
    red: 0,
    roundBlue: 0,
    roundRed: 0,
    blueRounds: 0,
    redRounds: 0,
    playerAct: 'idle',
    oppAct: 'idle',
    blocking: false,
    dodging: false,
    result: '' as '' | 'win' | 'lose' | 'tie',
    shake: false,
    burst: false,
    tip: '',
  });
  const fightRef = useRef({ blocking: false, dodging: false, active: false, phase: 'idle', demo: false, round: 0 });
  const [arenaLog, setArenaLog] = useState<string[]>([]);
  const [arenaCommentary, setArenaCommentary] = useState('');
  const [arenaCrowd, setArenaCrowd] = useState('');
  const [arenaRefCall, setArenaRefCall] = useState('');
  const [arenaPop, setArenaPop] = useState<{ id: number; text: string; side: 'blue' | 'red' } | null>(null);
  const [arenaUsed, setArenaUsed] = useState<string[]>([]);
  const [arenaBlocks, setArenaBlocks] = useState(0);
  const [arenaDodges, setArenaDodges] = useState(0);
  const [arenaFouls, setArenaFouls] = useState(0);
  const [arenaSaved, setArenaSaved] = useState(false);
  const [fightMode, setFightMode] = useState<'1p' | '2p'>('1p');
  const [bluePlayerName, setBluePlayerName] = useState('Blue Champion');
  const [redPlayerName, setRedPlayerName] = useState('Red Tiger');
  const [lastMover, setLastMover] = useState<'blue' | 'red' | null>(null);
  const spamRef = useRef({ move: '', count: 0, time: 0 });
  const spamRedRef = useRef({ move: '', count: 0, time: 0 });

  // Tournament State
  const [tourneyMode, setTourneyMode] = useState<'kyorugi' | 'poomsae' | 'team'>('kyorugi');
  const [tourneySize, setTourneySize] = useState<4 | 8>(4);
  const [tourneyPlayers, setTourneyPlayers] = useState<TPlayer[]>(() =>
    Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}`, avatar: TOURNEY_AVATARS[i % TOURNEY_AVATARS.length] }))
  );
  const [tourney, setTourney] = useState<{
    size: 4 | 8;
    players: TPlayer[];
    matches: TMatch[];
    champion: number | null;
    saved: boolean;
  } | null>(null);
  const [tourneyMatchId, setTourneyMatchId] = useState<number | null>(null);
  const [tourneyFight, setTourneyFight] = useState<{
    blue: number;
    red: number;
    time: number;
    phase: 'idle' | 'fighting' | 'done';
  }>({ blue: 0, red: 0, time: 45, phase: 'idle' });
  const [tourneyResult, setTourneyResult] = useState<{
    matchId: number;
    winner: number;
    loser: number;
    blue: number;
    red: number;
    isFinal: boolean;
  } | null>(null);
  const [tourneyChampionShown, setTourneyChampionShown] = useState(false);
  const [ceremony, setCeremony] = useState<{ kind: 'kyorugi' | 'poomsae' | 'team'; step: number } | null>(null);

  // Poomsae Contest State
  const [poomsaePlayers, setPoomsaePlayers] = useState<(TPlayer & { poomsae: number })[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      name: `Player ${i + 1}`,
      avatar: TOURNEY_AVATARS[i % TOURNEY_AVATARS.length],
      poomsae: 0,
    }))
  );
  const [poomsaeContest, setPoomsaeContest] = useState<{
    players: (TPlayer & { poomsae: number })[];
    matches: TMatch[];
    champion: number | null;
    saved: boolean;
  } | null>(null);
  const [poomsaePerf, setPoomsaePerf] = useState<PoomsaePerf | null>(null);
  const [poomsaeStats, setPoomsaeStats] = useState<Record<string, { perfect: number; good: number; miss: number; score: number }>>({});
  const [poomsaeChampionShown, setPoomsaeChampionShown] = useState(false);
  const [poomsaeResult, setPoomsaeResult] = useState<{
    matchId: number;
    winner: number;
    loser: number;
    blue: number;
    red: number;
    isFinal: boolean;
  } | null>(null);

  // Team Battle State
  const [teamBlue, setTeamBlue] = useState<string[]>(['Aya', 'Ben', 'Mia', 'Leo']);
  const [teamRed, setTeamRed] = useState<string[]>(['Noor', 'Omar', 'Sara', 'Ali']);
  const [teamBattle, setTeamBattle] = useState<{
    round: number;
    blueTotal: number;
    redTotal: number;
    roundBlue: number;
    roundRed: number;
    time: number;
    phase: 'idle' | 'fighting' | 'between' | 'done' | 'finished';
    results: { round: number; blue: number; red: number }[];
    winner: 'blue' | 'red' | null;
    saved: boolean;
  } | null>(null);
  const [teamChampionShown, setTeamChampionShown] = useState(false);

  useEffect(() => {
    fightRef.current = {
      blocking: fight.blocking,
      dodging: fight.dodging,
      active: fight.active,
      phase: fight.phase,
      demo: fight.demo,
      round: fight.round,
    };
  }, [fight, fightRound]);

  function arenaSay(text: string, crowd?: string, refCall?: string) {
    setArenaCommentary(text);
    setArenaLog((l) => [text, ...l].slice(0, 6));
    if (crowd) setArenaCrowd(crowd);
    if (refCall) {
      setArenaRefCall(refCall);
      setTimeout(() => setArenaRefCall(''), 2200);
    }
  }

  function showArenaPop(text: string, side: 'blue' | 'red') {
    const id = Date.now() + Math.random();
    setArenaPop({ id, text, side });
    setTimeout(() => setArenaPop((p) => (p && p.id === id ? null : p)), 1100);
  }

  function arenaAttack(move: string, side: 'blue' | 'red') {
    if (!fight.active || fight.phase !== 'fighting') return;
    const isPlayer = side === 'blue';
    if ((isPlayer || (fightMode === '2p' && !isPlayer)) && (move === 'Block' || move === 'Dodge')) {
      const whoName = isPlayer
        ? fightMode === '2p'
          ? bluePlayerName
          : pick(['Blue', 'نیلا', 'الأزرق'] as Tri, lang)
        : fightMode === '2p'
        ? redPlayerName
        : pick(['Red', 'سرخ', 'الأحمر'] as Tri, lang);
      const msg =
        move === 'Block'
          ? pick([`${whoName} — Perfect Block! Guard up!`, `${whoName} — کامل بلاک! گارڈ اوپر!`, `${whoName} — صد مثالي! ارفع حمايتك!`] as Tri, lang)
          : pick([`${whoName} — Great Dodge! Fast feet!`, `${whoName} — زبردست بچاؤ! تیز پاؤں!`, `${whoName} — مراوغة رائعة! أقدام سريعة!`] as Tri, lang);
      setLastMover(side);
      if (isPlayer) {
        setFight((f) => ({
          ...f,
          playerAct: move === 'Block' ? 'block' : 'dodge',
          blocking: move === 'Block',
          dodging: move === 'Dodge',
          tip: msg,
        }));
      } else {
        setFight((f) => ({ ...f, oppAct: move === 'Block' ? 'block' : 'dodge', tip: msg }));
      }
      if (move === 'Block') setArenaBlocks((b) => b + 1);
      else setArenaDodges((d) => d + 1);
      arenaSay(msg, pick(['👏 Crowd claps for the block!', '👏 ہجوم بلاک پر تالیاں بجاتا ہے!', '👏 الجمهور يصفق للصد!'] as Tri, lang), 'Break!');
      onBeep(520, 0.08);
      setTimeout(() => setFight((f) => ({ ...f, blocking: false, dodging: false, playerAct: 'idle', oppAct: 'idle' })), 1200);
      return;
    }

    if (isPlayer && !fight.demo) {
      const now = Date.now();
      const s = spamRef.current;
      if (s.move === move && now - s.time < 5000) s.count += 1;
      else {
        s.move = move;
        s.count = 1;
      }
      s.time = now;
      if (s.count >= 3) {
        s.count = 0;
        setArenaFouls((f) => f + 1);
        setFight((f) => ({
          ...f,
          blue: Math.max(0, f.blue - 1),
          roundBlue: Math.max(0, f.roundBlue - 1),
          playerAct: 'hit',
          oppAct: 'idle',
          shake: true,
          tip: 'Gam-jeom!',
        }));
        arenaSay(
          pick(['Gam-jeom! Foul! Mix your moves!', 'گام جیوم! فاؤل! چالیں بدلیں!', 'غامجيوم! خطأ! نوّع حركاتك!'] as Tri, lang),
          pick(['😮 Crowd: Oooh! Foul!', '😮 ہجوم: اوہ! فاؤل!', '😮 الجمهور: أوه! خطأ!'] as Tri, lang),
          'Gam-jeom! Foul!'
        );
        showArenaPop('-1', 'blue');
        onBeep(180, 0.2, 'sawtooth');
        setTimeout(() => setFight((f) => ({ ...f, shake: false, playerAct: 'idle' })), 550);
        return;
      }
    }

    if (!isPlayer && fightMode === '2p' && !fight.demo) {
      const now = Date.now();
      const s = spamRedRef.current;
      if (s.move === move && now - s.time < 5000) s.count += 1;
      else {
        s.move = move;
        s.count = 1;
      }
      s.time = now;
      if (s.count >= 3) {
        s.count = 0;
        setArenaFouls((f) => f + 1);
        setFight((f) => ({
          ...f,
          red: Math.max(0, f.red - 1),
          roundRed: Math.max(0, f.roundRed - 1),
          playerAct: 'idle',
          oppAct: 'hit',
          shake: true,
          tip: 'Gam-jeom!',
        }));
        arenaSay(
          pick([`Gam-jeom! Foul! ${redPlayerName} loses 1 point.`, `گام جیوم! فاؤل! ${redPlayerName} کا 1 پوائنٹ کم ہوا۔`, `غامجيوم! خطأ! ${redPlayerName} يخسر نقطة.`] as Tri, lang),
          pick(['😮 Crowd: Oooh! Foul!', '😮 ہجوم: اوہ! فاؤل!', '😮 الجمهور: أوه! خطأ!'] as Tri, lang),
          'Gam-jeom! Foul!'
        );
        showArenaPop('-1', 'red');
        onBeep(180, 0.2, 'sawtooth');
        setTimeout(() => setFight((f) => ({ ...f, shake: false, oppAct: 'idle' })), 550);
        return;
      }
    }

    setLastMover(side);
    const pts = ARENA_PTS[move] || 1;
    const head = move === 'Dollyo Chagi' || move === 'Dwit Chagi';
    const belt = pick(ARENA_BELT[move] || (['White Belt', 'سفید بیلٹ', 'الحزام الأبيض'] as Tri), lang);
    const msg = isPlayer
      ? pick([`${fightMode === '2p' ? bluePlayerName : 'Great'} ${move}! ${belt} kick, ${pts} points!`, `${fightMode === '2p' ? bluePlayerName : 'زبردست'} ${move}! ${belt} کک، ${pts} پوائنٹ!`, `${fightMode === '2p' ? bluePlayerName : 'رائع'} ${move}! ركلة ${belt}، ${pts} نقاط!`] as Tri, lang)
      : pick([`${fightMode === '2p' ? redPlayerName : 'Red'} scores with ${move}! ${pts} points!`, `${fightMode === '2p' ? redPlayerName : 'سرخ'} نے ${move} سے ${pts} پوائنٹ بنائے!`, `${fightMode === '2p' ? redPlayerName : 'الأحمر'} يسجل بـ ${move}! ${pts} نقاط!`] as Tri, lang);

    if (isPlayer) setArenaUsed((u) => (u.includes(move) ? u : [...u, move]));
    else if (fight.demo || fightMode === '2p') setArenaUsed((u) => (u.includes(move) ? u : [...u, move]));

    setFight((f) =>
      isPlayer
        ? { ...f, blue: f.blue + pts, roundBlue: f.roundBlue + pts, playerAct: 'lunge', oppAct: 'hit', shake: true, burst: true, tip: msg }
        : { ...f, red: f.red + pts, roundRed: f.roundRed + pts, playerAct: 'hit', oppAct: 'lunge', shake: true, burst: true, tip: msg }
    );
    arenaSay(
      msg,
      head
        ? pick(['😮 Crowd: Oooh! Head kick!', '😮 ہجوم: اوہ! سر پر کک!', '😮 الجمهور: أوه! ركلة للرأس!'] as Tri, lang)
        : pick(['🎉 Crowd cheers! Point!', '🎉 ہجوم خوش ہے! پوائنٹ!', '🎉 الجمهور يهتف! نقطة!'] as Tri, lang),
      'Point!'
    );
    showArenaPop(`+${pts}`, isPlayer ? 'blue' : 'red');
    onHappy();
    setTimeout(() => setFight((f) => ({ ...f, shake: false, burst: false, playerAct: 'idle', oppAct: 'idle' })), 600);
  }

  function startArena(demo = false) {
    onStopSpeak();
    spamRef.current = { move: '', count: 0, time: 0 };
    spamRedRef.current = { move: '', count: 0, time: 0 };
    setLastMover(null);
    setArenaSaved(false);
    setArenaUsed([]);
    setArenaBlocks(0);
    setArenaDodges(0);
    setArenaFouls(0);
    setArenaCrowd('');
    setArenaRefCall('');
    setArenaPop(null);
    const intro = pick(
      demo
        ? (['Pro Match demo! Two champions, one arena!', 'پرو میچ ڈیمو! دو چیمپئن، ایک ایرینا!', 'عرض مباراة المحترفين! بطلان، ساحة واحدة!'] as Tri)
        : (['Match on! Blue vs Red. Show kind, controlled kicks!', 'میچ شروع! نیلا بمقابلہ سرخ۔ مہربان، کنٹرول والی ککس دکھائیں!', 'المباراة بدأت! الأزرق ضد الأحمر. أظهر ركلات لطيفة ومنضبطة!'] as Tri),
      lang
    );
    setArenaLog([intro]);
    setArenaCommentary(intro);
    setFight({
      active: true,
      phase: 'fighting',
      demo,
      round: 1,
      time: 60,
      blue: 0,
      red: 0,
      roundBlue: 0,
      roundRed: 0,
      blueRounds: 0,
      redRounds: 0,
      playerAct: 'idle',
      oppAct: 'idle',
      blocking: false,
      dodging: false,
      result: '',
      shake: false,
      burst: false,
      tip: intro,
    });
    onSpeakCoach(intro);
  }

  function stopArena() {
    setFight((f) => ({ ...f, active: false, phase: 'idle', demo: false, playerAct: 'idle', oppAct: 'idle' }));
    onStopSpeak();
  }

  function endArenaRound() {
    if (!fight.active || fight.phase !== 'fighting') return;
    const blueWon = fight.roundBlue > fight.roundRed;
    const redWon = fight.roundRed > fight.roundBlue;
    const nb = fight.blueRounds + (blueWon ? 1 : 0);
    const nr = fight.redRounds + (redWon ? 1 : 0);
    const finished = fight.round >= 3;
    const winner = finished
      ? nb > nr
        ? 'win'
        : nr > nb
        ? 'lose'
        : fight.blue > fight.red
        ? 'win'
        : fight.blue < fight.red
        ? 'lose'
        : 'tie'
      : '';
    const roundMsg = pick(
      [
        `Break! Round ${fight.round} done. Blue ${fight.roundBlue} — Red ${fight.roundRed}.`,
        `بریک! راؤنڈ ${fight.round} مکمل۔ نیلا ${fight.roundBlue} — سرخ ${fight.roundRed}۔`,
        `استراحة! انتهت الجولة ${fight.round}. الأزرق ${fight.roundBlue} — الأحمر ${fight.roundRed}.`,
      ] as Tri,
      lang
    );
    arenaSay(roundMsg, pick(['👏 Crowd claps!', '👏 ہجوم تالیاں بجاتا ہے!', '👏 الجمهور يصفق!'] as Tri, lang), 'Break!');
    setFight((f) => ({
      ...f,
      active: !finished,
      phase: finished ? 'finished' : 'between',
      blueRounds: nb,
      redRounds: nr,
      result: finished ? (winner as any) : '',
      playerAct: 'idle',
      oppAct: 'idle',
      blocking: false,
      dodging: false,
      tip: roundMsg,
    }));
  }

  function nextArenaRound() {
    setFight((f) => ({
      ...f,
      active: true,
      phase: 'fighting',
      round: f.round + 1,
      time: 60,
      roundBlue: 0,
      roundRed: 0,
      playerAct: 'idle',
      oppAct: 'idle',
      tip: pick(['Round on!', 'راؤنڈ شروع!', 'الجولة بدأت!'] as Tri, lang),
    }));
  }

  function saveArenaResult() {
    if (arenaSaved || fight.phase !== 'finished') return;
    const name = progress.athleteName || athleteInput.trim() || pick(['Champion Athlete', 'چیمپئن کھلاڑی', 'الرياضي البطل'] as Tri, lang);
    const winnerLabel =
      fight.result === 'win'
        ? fightMode === '2p'
          ? bluePlayerName
          : pick(['Blue', 'نیلا', 'الأزرق'] as Tri, lang)
        : fight.result === 'lose'
        ? fightMode === '2p'
          ? redPlayerName
          : pick(['Red', 'سرخ', 'الأحمر'] as Tri, lang)
        : pick(['Tie', 'برابر', 'تعادل'] as Tri, lang);
    setProgress((p) => ({
      ...p,
      athleteName: name,
      fightResults: [
        ...(p.fightResults || []),
        { athlete: name, blue: fight.blue, red: fight.red, winner: winnerLabel, rounds: 3, date: new Date().toISOString().slice(0, 10), moves: arenaUsed },
      ],
    }));
    onAddXp(100, `${pick(['Match saved!', 'میچ محفوظ ہو گیا!', 'تم حفظ المباراة!'] as Tri, lang)} +100 ${t('xp')} 🏆`);
    setArenaSaved(true);
  }

  useEffect(() => {
    if (!fight.active || fight.phase !== 'fighting') return;
    const tt = setInterval(() => setFight((f) => ({ ...f, time: Math.max(0, f.time - 1) })), 1000);
    return () => clearInterval(tt);
  }, [fight.active, fight.phase, fight.round]);

  useEffect(() => {
    if (fight.active && fight.phase === 'fighting' && fight.time === 0) endArenaRound();
  }, [fight.time, fight.active, fight.phase]);

  useEffect(() => {
    if (!fight.active || fight.phase !== 'fighting' || fight.demo || fightMode === '2p') return;
    const opp = FIGHT_OPPONENTS[fightRound];
    const tt = setInterval(() => {
      if (fightRef.current.blocking) {
        arenaSay(pick(['Perfect Block! Red attack stopped!', 'کامل بلاک! سرخ حملہ رک گیا!', 'صد مثالي! توقف هجوم الأحمر!'] as Tri, lang), pick(['👏 Crowd claps!', '👏 ہجوم تالیاں بجاتا ہے!', '👏 الجمهور يصفق!'] as Tri, lang), 'Break!');
        setFight((f) => ({ ...f, oppAct: 'hit', playerAct: 'block', burst: true }));
        setTimeout(() => setFight((f) => ({ ...f, burst: false, oppAct: 'idle', playerAct: 'idle' })), 600);
        return;
      }
      if (fightRef.current.dodging) {
        arenaSay(pick(['Great Dodge! Red missed!', 'زبردست بچاؤ! سرخ چوک گیا!', 'مراوغة رائعة! أخطأ الأحمر!'] as Tri, lang), pick(['😮 Crowd: Oooh!', '😮 ہجوم: اوہ!', '😮 الجمهور: أوه!'] as Tri, lang), 'Break!');
        setFight((f) => ({ ...f, oppAct: 'lunge', playerAct: 'dodge' }));
        setTimeout(() => setFight((f) => ({ ...f, oppAct: 'idle', playerAct: 'idle' })), 600);
        return;
      }
      const moves = ['Ap Chagi', 'Dollyo Chagi', 'Dwit Chagi', 'Punch'];
      arenaAttack(moves[Math.floor(Math.random() * moves.length)], 'red');
    }, opp.speed);
    return () => clearInterval(tt);
  }, [fight.active, fight.phase, fight.demo, fightRound, fight.round, fightMode]);

  useEffect(() => {
    if (!fight.active || fight.phase !== 'fighting' || !fight.demo) return;
    const tt = setInterval(() => {
      const moves = ['Ap Chagi', 'Dollyo Chagi', 'Dwit Chagi', 'Punch'];
      const side = Math.random() < 0.5 ? 'blue' : 'red';
      arenaAttack(moves[Math.floor(Math.random() * moves.length)], side);
    }, 1100);
    return () => clearInterval(tt);
  }, [fight.active, fight.phase, fight.demo, fight.round, fight.blue, fight.red]);

  // --- Tournament Handlers ---
  function openCeremony(kind: 'kyorugi' | 'poomsae' | 'team') {
    setCeremony({ kind, step: 0 });
  }
  function startTournament() {
    const players = tourneyPlayers.slice(0, tourneySize).map((p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}` }));
    setTourney({ size: tourneySize, players, matches: buildTourneyMatches(tourneySize), champion: null, saved: false });
    setTourneyMatchId(null);
    setTourneyResult(null);
    setTourneyChampionShown(false);
    setTourneyFight({ blue: 0, red: 0, time: 45, phase: 'idle' });
    onCheer(t('canDo'));
  }
  function newTournament() {
    onStopSpeak();
    setTourney(null);
    setTourneyMatchId(null);
    setTourneyResult(null);
    setTourneyChampionShown(false);
    setTourneyFight({ blue: 0, red: 0, time: 45, phase: 'idle' });
  }
  function openTourneyMatch(id: number) {
    if (!tourney) return;
    const m = tourney.matches.find((x) => x.id === id);
    if (!m || m.blue === null || m.red === null || m.winner !== null) return;
    setTourneyMatchId(id);
    setTourneyFight({ blue: 0, red: 0, time: 45, phase: 'idle' });
    setTourneyResult(null);
    onBeep(560, 0.07);
  }
  function tourneyScore(side: 'blue' | 'red', pts: number) {
    if (tourneyFight.phase !== 'fighting') return;
    onBeep(620, 0.07);
    setTourneyFight((f) => (side === 'blue' ? { ...f, blue: f.blue + pts } : { ...f, red: f.red + pts }));
  }
  function finishTourneyMatch() {
    if (!tourney || tourneyMatchId === null || tourneyFight.phase === 'done') return;
    const m = tourney.matches.find((x) => x.id === tourneyMatchId);
    if (!m || m.blue === null || m.red === null) return;
    const blue = tourneyFight.blue;
    const red = tourneyFight.red;
    const winner = blue >= red ? m.blue : m.red;
    const loser = winner === m.blue ? m.red : m.blue;
    const isFinal = !tourney.matches.some((x) => x.blueFrom === m.id || x.redFrom === m.id);
    const nextMatches = tourney.matches.map((x) =>
      x.id === m.id
        ? { ...x, blueScore: blue, redScore: red, winner }
        : x.blueFrom === m.id
        ? { ...x, blue: winner }
        : x.redFrom === m.id
        ? { ...x, red: winner }
        : x
    );
    const championName = tourney.players[winner].name;
    setTourney({ ...tourney, matches: nextMatches, champion: isFinal ? winner : null, saved: isFinal ? true : tourney.saved });
    setTourneyFight((f) => ({ ...f, phase: 'done' }));
    setTourneyResult({ matchId: m.id, winner, loser, blue, red, isFinal });
    onHappy();
    onCheer(t('awesome'));
    if (isFinal) {
      setTourneyChampionShown(true);
      openCeremony('kyorugi');
      onSpeakCoach(
        pick([`Tournament Champion: ${championName}! Amazing! You are a star!`, `ٹورنامنٹ چیمپئن: ${championName}! شاباش!`, `بطل البطولة: ${championName}! رائع!`] as Tri, lang)
      );
      if (!tourney.saved) {
        setProgress((p) => ({
          ...p,
          athleteName: championName,
          medals: { gold: (p.medals?.gold || 0) + 1, silver: (p.medals?.silver || 0) + 1, bronze: (p.medals?.bronze || 0) + 1 },
          fightResults: [
            ...(p.fightResults || []),
            { athlete: championName, blue, red, winner: championName, rounds: 1, date: new Date().toISOString().slice(0, 10), moves: ['Tournament Final', 'Body Kick +2', 'Head Kick +3'] },
          ],
        }));
        onAddXp(400, `${pick([`Tournament Champion: ${championName}!`, `ٹورنامنٹ چیمپئن: ${championName}!`, `بطل البطولة: ${championName}!`] as Tri, lang)} +400 ${t('xp')} 🏆`);
      }
    }
  }
  useEffect(() => {
    if (tourneyMatchId === null || tourneyFight.phase !== 'fighting') return;
    if (tourneyFight.time <= 0) {
      finishTourneyMatch();
      return;
    }
    const tt = setTimeout(() => setTourneyFight((f) => ({ ...f, time: f.time - 1 })), 1000);
    return () => clearTimeout(tt);
  }, [tourneyMatchId, tourneyFight.phase, tourneyFight.time]);

  const tourneyMatch = tourney && tourneyMatchId !== null ? tourney.matches.find((x) => x.id === tourneyMatchId) : undefined;
  const tourneyChampion = tourney && tourney.champion !== null ? tourney.players[tourney.champion] : null;

  // --- Poomsae Contest ---
  function poomsaeJudges(results: ('Perfect' | 'Good' | 'Miss')[]) {
    const base = results.length ? results.reduce((s, r) => s + (r === 'Perfect' ? 10 : r === 'Good' ? 8 : 5.5), 0) / results.length : 5.5;
    const clamp = (v: number) => Math.min(10, Math.max(5, Math.round(v * 10) / 10));
    const judges = [clamp(base - 0.4), clamp(base + 0.2), clamp(base + 0.1)];
    const final = Math.round(((judges[0] + judges[1] + judges[2]) / 3) * 10) / 10;
    return { judges, final };
  }
  function startPoomsaeContest() {
    const players = poomsaePlayers.map((p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}` }));
    setPoomsaeContest({ players, matches: buildTourneyMatches(4), champion: null, saved: false });
    setPoomsaePerf(null);
    setPoomsaeStats({});
    setPoomsaeResult(null);
    setPoomsaeChampionShown(false);
    onCheer(t('canDo'));
  }
  function newPoomsaeContest() {
    onStopSpeak();
    setPoomsaeContest(null);
    setPoomsaePerf(null);
    setPoomsaeStats({});
    setPoomsaeResult(null);
    setPoomsaeChampionShown(false);
  }
  function openPoomsaeMatch(id: number) {
    if (!poomsaeContest) return;
    const m = poomsaeContest.matches.find((x) => x.id === id);
    if (!m || m.blue === null || m.red === null || m.winner !== null) return;
    setPoomsaePerf({ matchId: id, playerIdx: m.blue, step: 0, phase: 'ready', results: [], litAt: 0, judges: [], final: 0 });
    setPoomsaeResult(null);
    onBeep(560, 0.07);
  }
  function applyPoomsaeRating(rating: 'Perfect' | 'Good' | 'Miss') {
    if (!poomsaePerf || poomsaePerf.phase !== 'lit') return;
    const results = [...poomsaePerf.results, rating];
    if (rating === 'Perfect') onHappy();
    else onBeep(rating === 'Good' ? 520 : 220, 0.12, rating === 'Good' ? 'sine' : 'sawtooth');
    if (results.length < 5) {
      setPoomsaePerf({ ...poomsaePerf, results, step: poomsaePerf.step + 1, litAt: Date.now() });
      return;
    }
    const { judges, final } = poomsaeJudges(results);
    setPoomsaeStats((s) => ({
      ...s,
      [`${poomsaePerf.matchId}-${poomsaePerf.playerIdx}`]: {
        perfect: results.filter((r) => r === 'Perfect').length,
        good: results.filter((r) => r === 'Good').length,
        miss: results.filter((r) => r === 'Miss').length,
        score: final,
      },
    }));
    setPoomsaePerf({ ...poomsaePerf, results, phase: 'judges', judges, final });
  }
  function doPoomsaeMove() {
    if (!poomsaePerf || poomsaePerf.phase !== 'lit') return;
    const elapsed = Date.now() - poomsaePerf.litAt;
    applyPoomsaeRating(elapsed <= 800 ? 'Perfect' : elapsed <= 1500 ? 'Good' : 'Miss');
  }
  useEffect(() => {
    if (!poomsaePerf || poomsaePerf.phase !== 'lit') return;
    const tt = setTimeout(() => applyPoomsaeRating('Miss'), 1800);
    return () => clearTimeout(tt);
  }, [poomsaePerf]);

  function finishPoomsaePerf() {
    if (!poomsaeContest || !poomsaePerf || poomsaePerf.phase !== 'judges') return;
    const m = poomsaeContest.matches.find((x) => x.id === poomsaePerf.matchId);
    if (!m || m.blue === null || m.red === null) return;
    if (poomsaePerf.playerIdx === m.blue) {
      setPoomsaePerf({ matchId: m.id, playerIdx: m.red, step: 0, phase: 'ready', results: [], litAt: 0, judges: [], final: 0 });
      return;
    }
    const blueScore = poomsaeStats[`${m.id}-${m.blue}`]?.score ?? 0;
    const redScore = poomsaePerf.final;
    const winner = blueScore >= redScore ? m.blue : m.red;
    const loser = winner === m.blue ? m.red : m.blue;
    const isFinal = !poomsaeContest.matches.some((x) => x.blueFrom === m.id || x.redFrom === m.id);
    const nextMatches = poomsaeContest.matches.map((x) =>
      x.id === m.id ? { ...x, blueScore, redScore, winner } : x.blueFrom === m.id ? { ...x, blue: winner } : x.redFrom === m.id ? { ...x, red: winner } : x
    );
    setPoomsaeContest({ ...poomsaeContest, matches: nextMatches, champion: isFinal ? winner : null, saved: isFinal ? true : poomsaeContest.saved });
    setPoomsaePerf(null);
    setPoomsaeResult({ matchId: m.id, winner, loser, blue: blueScore, red: redScore, isFinal });
    onHappy();
    onCheer(t('awesome'));
    if (isFinal) {
      setPoomsaeChampionShown(true);
      openCeremony('poomsae');
      const championName = poomsaeContest.players[winner].name;
      onSpeakCoach(pick([`Poomsae Champion: ${championName}! Beautiful and brave!`, `پومسے چیمپئن: ${championName}!`, `بطل البومساي: ${championName}!`] as Tri, lang));
      if (!poomsaeContest.saved) {
        setProgress((p) => ({
          ...p,
          athleteName: championName,
          medals: { gold: (p.medals?.gold || 0) + 1, silver: (p.medals?.silver || 0) + 1, bronze: (p.medals?.bronze || 0) + 1 },
          fightResults: [
            ...(p.fightResults || []),
            { athlete: championName, blue: blueScore, red: redScore, winner: championName, rounds: 1, date: new Date().toISOString().slice(0, 10), moves: ['Poomsae Contest', 'Taegeuk / Koryo'] },
          ],
        }));
        onAddXp(200, `${pick([`Poomsae Champion: ${championName}!`, `پومسے چیمپئن: ${championName}!`, `بطل البومساي: ${championName}!`] as Tri, lang)} +200 ${t('xp')} 🏆`);
      }
    }
  }
  const poomsaeMatch = poomsaeContest && poomsaePerf ? poomsaeContest.matches.find((x) => x.id === poomsaePerf.matchId) : undefined;
  const poomsaeChampion = poomsaeContest && poomsaeContest.champion !== null ? poomsaeContest.players[poomsaeContest.champion] : null;

  // --- Team Battle ---
  function startTeamBattle() {
    const b = teamBlue.map((n, i) => n.trim() || `Blue ${i + 1}`);
    const r = teamRed.map((n, i) => n.trim() || `Red ${i + 1}`);
    setTeamBlue(b);
    setTeamRed(r);
    setTeamBattle({ round: 1, blueTotal: 0, redTotal: 0, roundBlue: 0, roundRed: 0, time: 45, phase: 'idle', results: [], winner: null, saved: false });
    setTeamChampionShown(false);
    onCheer(t('canDo'));
  }
  function newTeamBattle() {
    onStopSpeak();
    setTeamBattle(null);
    setTeamChampionShown(false);
  }
  function teamScore(side: 'blue' | 'red', pts: number) {
    if (!teamBattle || teamBattle.phase !== 'fighting') return;
    onBeep(620, 0.07);
    setTeamBattle((f) => (f ? (side === 'blue' ? { ...f, roundBlue: f.roundBlue + pts } : { ...f, roundRed: f.roundRed + pts }) : f));
  }
  function finishTeamRound() {
    if (!teamBattle || (teamBattle.phase !== 'fighting' && teamBattle.phase !== 'idle')) return;
    const blueTotal = teamBattle.blueTotal + teamBattle.roundBlue;
    const redTotal = teamBattle.redTotal + teamBattle.roundRed;
    const results = [...teamBattle.results, { round: teamBattle.round, blue: teamBattle.roundBlue, red: teamBattle.roundRed }];
    const isLast = teamBattle.round >= 4;
    const winner = isLast ? (blueTotal >= redTotal ? ('blue' as const) : ('red' as const)) : null;
    setTeamBattle({ ...teamBattle, blueTotal, redTotal, results, phase: isLast ? 'finished' : 'between', winner, saved: isLast ? true : teamBattle.saved });
    onHappy();
    if (isLast) {
      setTeamChampionShown(true);
      openCeremony('team');
      const names = winner === 'blue' ? teamBlue : teamRed;
      onSpeakCoach(pick([`Team victory! ${winner === 'blue' ? 'Blue Team' : 'Red Team'} wins!`, `ٹیم کی جیت!`, `فوز الفريق!`] as Tri, lang));
      setProgress((p) => ({
        ...p,
        athleteName: names[0],
        medals: { gold: (p.medals?.gold || 0) + 1, silver: (p.medals?.silver || 0) + 1, bronze: (p.medals?.bronze || 0) + 1 },
        fightResults: [
          ...(p.fightResults || []),
          { athlete: names.join(', '), blue: blueTotal, red: redTotal, winner: winner === 'blue' ? 'Blue Team' : 'Red Team', rounds: 4, date: new Date().toISOString().slice(0, 10), moves: ['Team Battle', 'Body Kick +2'] },
        ],
      }));
      onAddXp(200, `${pick(['Team Battle winners! +200 XP!', 'ٹیم بیٹل فاتح! +200 ایکس پی!', 'فائزو معركة الفرق! +200 نقطة!'] as Tri, lang)} 🏆`);
    }
  }
  function nextTeamRound() {
    if (!teamBattle) return;
    setTeamBattle({ ...teamBattle, round: teamBattle.round + 1, roundBlue: 0, roundRed: 0, time: 45, phase: 'idle' });
  }
  useEffect(() => {
    if (!teamBattle || teamBattle.phase !== 'fighting') return;
    if (teamBattle.time <= 0) {
      finishTeamRound();
      return;
    }
    const tt = setTimeout(() => setTeamBattle((f) => (f ? { ...f, time: f.time - 1 } : f)), 1000);
    return () => clearTimeout(tt);
  }, [teamBattle]);

  function bracketMedals(
    players: TPlayer[],
    matches: TMatch[],
    isPoomsae: boolean
  ): { gold: MedalEntry; silver: MedalEntry; bronze: MedalEntry } | null {
    const final = matches.find((m) => !matches.some((x) => x.blueFrom === m.id || x.redFrom === m.id));
    if (!final || final.winner === null || final.blue === null || final.red === null) return null;
    const goldIdx = final.winner;
    const silverIdx = goldIdx === final.blue ? final.red : final.blue;
    const fmt = (v: number) => (isPoomsae ? v.toFixed(1) : `${v}`);
    const goldScore = goldIdx === final.blue ? final.blueScore : final.redScore;
    const silverScore = silverIdx === final.blue ? final.blueScore : final.redScore;
    const semiRound = Math.max(...matches.map((m) => m.round)) - 1;
    const semiLosers = matches
      .filter((m) => m.round === semiRound && m.winner !== null && m.blue !== null && m.red !== null)
      .map((m) => {
        const loser = m.winner === m.blue ? m.red! : m.blue!;
        const loserScore = m.winner === m.blue ? m.redScore : m.blueScore;
        return { loser, loserScore };
      });
    semiLosers.sort((a, b) => b.loserScore - a.loserScore);
    const bronzeIdx = semiLosers[0]?.loser ?? silverIdx;
    const bronzeScore = semiLosers[0]?.loserScore ?? silverScore;
    const mk = (idx: number, score: string, label: Tri): MedalEntry => ({
      avatar: players[idx]?.avatar || '🥋',
      names: [players[idx]?.name || `Player ${idx + 1}`],
      score,
      label,
    });
    return {
      gold: mk(goldIdx, fmt(goldScore), ['Gold Champion', 'گولڈ چیمپئن', 'بطل ذهبي']),
      silver: mk(silverIdx, fmt(silverScore), ['Silver', 'سلور', 'فضي']),
      bronze: mk(bronzeIdx, fmt(bronzeScore), ['Bronze', 'برونز', 'برونزي']),
    };
  }

  function ceremonyEntries(kind: 'kyorugi' | 'poomsae' | 'team') {
    if (kind === 'kyorugi') {
      if (!tourney || tourney.champion === null) return null;
      const b = bracketMedals(tourney.players, tourney.matches, false);
      if (!b) return null;
      return { ...b, championNames: b.gold.names, title: ['Kyorugi Medal Ceremony', 'کیوروگی میڈل تقریب', 'حفل ميداليات كيوروغي'] as Tri };
    }
    if (kind === 'poomsae') {
      if (!poomsaeContest || poomsaeContest.champion === null) return null;
      const b = bracketMedals(poomsaeContest.players, poomsaeContest.matches, true);
      if (!b) return null;
      return { ...b, championNames: b.gold.names, title: ['Poomsae Medal Ceremony', 'پومسے میڈل تقریب', 'حفل ميداليات البومساي'] as Tri };
    }
    if (!teamBattle || !teamBattle.winner) return null;
    const winNames = teamBattle.winner === 'blue' ? teamBlue : teamRed;
    const loseNames = teamBattle.winner === 'blue' ? teamRed : teamBlue;
    const all = [...teamBlue, ...teamRed];
    return {
      gold: { avatar: teamBattle.winner === 'blue' ? '🔵' : '🔴', names: winNames, score: `${teamBattle.blueTotal} — ${teamBattle.redTotal}`, label: ['Gold Team', 'گولڈ ٹیم', 'الفريق الذهبي'] as Tri },
      silver: { avatar: teamBattle.winner === 'blue' ? '🔴' : '🔵', names: loseNames, score: `${teamBattle.blueTotal} — ${teamBattle.redTotal}`, label: ['Silver Team', 'سلور ٹیم', 'الفريق الفضي'] as Tri },
      bronze: { avatar: '🤝', names: all, score: pick(['Team Spirit', 'ٹیم اسپرٹ', 'روح الفريق'] as Tri, lang), label: ['Bronze • Team Spirit', 'برونز • ٹیم اسپرٹ', 'برونزي • روح الفريق'] as Tri },
      championNames: winNames,
      title: ['Team Medal Ceremony', 'ٹیم میڈل تقریب', 'حفل ميداليات الفرق'] as Tri,
    };
  }

  function ceremonyText(kind: 'kyorugi' | 'poomsae' | 'team', step: number): string {
    const e = ceremonyEntries(kind);
    const names = (x?: MedalEntry) => (x ? x.names.join(', ') : '');
    if (!e) return pick(['Medal Ceremony! Well done, champions!', 'میڈل تقریب! شاباش!', 'حفل الميداليات! أحسنتم!'] as Tri, lang);
    if (step === 0) return pick([`And the Bronze goes to...`, `اور برونز جاتا ہے…`, `والميدالية البرونزية تذهب إلى…`] as Tri, lang);
    if (step === 1) return pick([`Bronze medal! ${names(e.bronze)}! Wonderful!`, `برونز میڈل! ${names(e.bronze)}!`, `ميدالية برونزية! ${names(e.bronze)}!`] as Tri, lang);
    if (step === 2) return pick([`And the Silver goes to...`, `اور سلور جاتا ہے…`, `والميدالية الفضية تذهب إلى…`] as Tri, lang);
    if (step === 3) return pick([`Silver medal! ${names(e.silver)}! Amazing!`, `سلور میڈل! ${names(e.silver)}!`, `ميدالية فضية! ${names(e.silver)}!`] as Tri, lang);
    if (step === 4) return pick([`Drum roll please... And the GOLD CHAMPION is...`, `ڈرم رول… اور گولڈ چیمپئن ہے…`, `قرع الطبول… والبطل الذهبي هو…`] as Tri, lang);
    return pick([`GOLD CHAMPION! ${names(e.gold)}! Trophy!`, `گولڈ چیمپئن! ${names(e.gold)}! ٹرافی!`, `البطل الذهبي! ${names(e.gold)}! الكأس!`] as Tri, lang);
  }

  function advanceCeremony(kind: 'kyorugi' | 'poomsae' | 'team') {
    const next = Math.min(5, (ceremony?.step ?? 0) + 1);
    setCeremony({ kind, step: next });
    if (next === 5) onHappy();
    else if (next === 4) onBeep(220, 0.4, 'sine');
    onSpeakCoach(ceremonyText(kind, next));
  }

  function renderMedalCeremony(kind: 'kyorugi' | 'poomsae' | 'team', onResults: () => void, onNew: () => void) {
    const entries = ceremonyEntries(kind);
    if (!entries) return null;
    const step = ceremony?.kind === kind ? ceremony.step : 0;
    const revealed = (place: 'gold' | 'silver' | 'bronze') => (place === 'bronze' ? step >= 1 : place === 'silver' ? step >= 3 : step >= 5);
    const podium = (place: 'gold' | 'silver' | 'bronze') => {
      const e = entries[place];
      const show = revealed(place);
      const cfg = place === 'gold' ? { h: 150, bg: '#FDE047', medal: '🥇', rank: '1st' } : place === 'silver' ? { h: 112, bg: '#E5E7EB', medal: '🥈', rank: '2nd' } : { h: 82, bg: '#FED7AA', medal: '🥉', rank: '3rd' };
      return (
        <div className="flex flex-1 flex-col items-center justify-end">
          <div className="mb-2 text-center">
            <div className="text-5xl leading-none">{show ? e.avatar : '❓'}</div>
            <div className="mt-1 text-4xl leading-none">{show ? cfg.medal : '❓'}</div>
            {show && (
              <div className="mt-2 break-words text-[clamp(1.05rem,4vw,1.5rem)] font-black leading-tight text-[#0F172A]">
                {e.names.map((n, i) => (
                  <div key={i}>{n}</div>
                ))}
              </div>
            )}
            {show && <div className="mt-1 text-sm font-black text-[#0F172A]">{tr('Score:', 'اسکور:', 'النتيجة:')} {e.score}</div>}
          </div>
          <div className="flex w-full flex-col items-center justify-center rounded-t-2xl border-[3px] border-b-0 border-[#0F172A] px-2 py-2 text-[#0F172A]" style={{ height: cfg.h, background: cfg.bg }}>
            <div className="text-2xl font-black">{cfg.rank}</div>
            <div className="text-xs font-black">{pick(e.label, lang)}</div>
          </div>
        </div>
      );
    };

    return (
      <div className="relative mt-3 overflow-hidden rounded-2xl border-[4px] border-[#0F172A] bg-[#FEF08A] p-4 text-center text-[#0F172A] sm:p-5">
        {step === 5 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <span key={i} className="confetti" style={{ left: `${8 + i * 12}%`, background: ['#facc15', '#2563eb', '#22c55e', '#dc2626'][i % 4] }} />
            ))}
          </div>
        )}
        <p className="text-xs font-black tracking-widest">🎖️ {pick(entries.title, lang)}</p>
        {step === 5 && <div className="mt-1 text-[clamp(4rem,18vw,7rem)] leading-none">🏆</div>}
        {step === 4 && <div className="mt-1 text-6xl leading-none">🥁🥁🥁</div>}
        <h3 className="mt-2 text-[clamp(1.35rem,6vw,2.2rem)] font-black leading-tight">{ceremonyText(kind, step)}</h3>
        <button className="ghost mt-2 !min-h-[44px]" onClick={() => onSpeakCoach(ceremonyText(kind, step))}>
          🔊 {tr('Coach Voice', 'کوچ کی آواز', 'صوت المدرب')}
        </button>
        <div className="mx-auto mt-4 max-w-[680px] rounded-2xl border-[3px] border-[#0F172A] bg-white p-3">
          <div className="flex items-end gap-2 sm:gap-3" style={{ direction: 'ltr' }}>
            {podium('silver')}
            {podium('gold')}
            {podium('bronze')}
          </div>
        </div>
        {step < 5 ? (
          <button className="big-btn mt-4 w-full" onClick={() => advanceCeremony(kind)}>
            {step === 4 ? `🥁 ${tr('Reveal Gold Champion!', 'گولڈ چیمپئن دکھائیں!', 'اكشف البطل الذهبي!')}` : `${tr('Next', 'آگے', 'التالي')} ➡️`}
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="ghost" onClick={onResults}>
              📊 {tr('See Full Results', 'مکمل نتائج دیکھیں', 'شاهد النتائج الكاملة')}
            </button>
            <button className="ghost" onClick={onNew}>
              🔄 {tr('New Tournament', 'نیا ٹورنامنٹ', 'بطولة جديدة')}
            </button>
            <button
              className="big-btn"
              onClick={() => {
                setProgress((p) => ({ ...p, athleteName: entries.championNames[0] }));
                setAthleteInput(entries.championNames[0]);
                setCeremony(null);
                onGoToProgress();
              }}
            >
              📊 {tr('View Report Card', 'رپورٹ کارڈ دیکھیں', 'شاهد بطاقة التقرير')}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Arena Modes">
        {[
          ['fight', `🥊 ${t('fightTitle')}`],
          ['tournament', `🏆 ${tr('Tournaments', 'ٹورنامنٹس', 'البطولات')}`],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={arenaTab === id}
            onClick={() => {
              onStopSpeak();
              setArenaTab(id as 'fight' | 'tournament');
              onBeep(540, 0.06);
            }}
            className={`tab-btn ${arenaTab === id ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {arenaTab === 'fight' && (
        <article className="card mx-auto max-w-[960px] overflow-hidden p-4 sm:p-5">
          <h2 className="text-2xl font-black">🥊 {t('fightTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('fightDesc')}</p>

          <div className="mt-3 rounded-2xl border-[3px] border-[#0F172A] bg-[#FEF08A] p-3 text-[#0F172A]">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setFightMode('1p');
                  stopArena();
                }}
                aria-pressed={fightMode === '1p'}
                className="rounded-full px-4 py-3 text-sm font-black min-h-[48px]"
                style={{ background: fightMode === '1p' ? '#1D4ED8' : '#FFFFFF', color: fightMode === '1p' ? '#FFFFFF' : '#0F172A', border: '3px solid #0F172A' }}
              >
                👤 {tr('1 Player vs Computer', '1 کھلاڑی بمقابلہ کمپیوٹر', 'لاعب واحد ضد الحاسوب')}
              </button>
              <button
                onClick={() => {
                  setFightMode('2p');
                  stopArena();
                }}
                aria-pressed={fightMode === '2p'}
                className="rounded-full px-4 py-3 text-sm font-black min-h-[48px]"
                style={{ background: fightMode === '2p' ? '#DC2626' : '#FFFFFF', color: fightMode === '2p' ? '#FFFFFF' : '#0F172A', border: '3px solid #0F172A' }}
              >
                👥 {tr('2 Players', '2 کھلاڑی', 'لاعبان')}
              </button>
            </div>
            {fightMode === '2p' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="!text-[#0F172A] !m-0 mb-1">🔵 {tr('Blue Player Name', 'نیلے کھلاڑی کا نام', 'اسم اللاعب الأزرق')}</label>
                  <input value={bluePlayerName} onChange={(e) => setBluePlayerName(e.target.value || 'Blue Champion')} />
                </div>
                <div>
                  <label className="!text-[#0F172A] !m-0 mb-1">🔴 {tr('Red Player Name', 'سرخ کھلاڑی کا نام', 'اسم اللاعب الأحمر')}</label>
                  <input value={redPlayerName} onChange={(e) => setRedPlayerName(e.target.value || 'Red Tiger')} />
                </div>
              </div>
            )}
          </div>

          {fightMode === '1p' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {FIGHT_OPPONENTS.map((o, i) => (
                <button
                  key={i}
                  disabled={fight.active}
                  onClick={() => {
                    setFightRound(i);
                    stopArena();
                  }}
                  aria-pressed={fightRound === i}
                  className="rounded-full px-4 py-2 text-sm font-black min-h-[44px]"
                  style={{ background: fightRound === i ? '#1D4ED8' : '#FFFFFF', color: fightRound === i ? '#FFFFFF' : '#0F172A', border: '3px solid #0F172A' }}
                >
                  {o.emoji} {i + 1}. {pick(o.name, lang)} ({i === 0 ? t('easy') : i === 1 ? t('medium') : t('hard')})
                </button>
              ))}
            </div>
          )}

          {/* Scoreboard */}
          <div className="mt-4 overflow-hidden rounded-2xl border-[4px] border-[#0F172A] bg-white text-[#0F172A] tabular-nums">
            <div className="flex items-stretch">
              <div className="flex-1 bg-[#1D4ED8] p-3 text-center text-white">
                <div className="text-xs font-black tracking-widest">🔵 {fightMode === '2p' ? bluePlayerName : 'BLUE'}</div>
                <div className="text-[clamp(2rem,8vw,3.2rem)] font-black leading-none">{fight.blue}</div>
                <div className="mt-1 text-xs font-black">{tr('Rounds', 'راؤنڈ', 'الجولات')} {fight.blueRounds}</div>
              </div>
              <div className="flex flex-col items-center justify-center bg-[#0F172A] px-3 py-2 text-center text-white">
                <div className="text-base sm:text-lg font-black">
                  BLUE {fight.blue} - {fight.red} RED
                </div>
                <div className="text-sm font-black">
                  {tr('Round', 'راؤنڈ', 'الجولة')} {fight.round}/3 · ⏱ {fight.time}s
                </div>
              </div>
              <div className="flex-1 bg-[#DC2626] p-3 text-center text-white">
                <div className="text-xs font-black tracking-widest">🔴 {fightMode === '2p' ? redPlayerName : 'RED'}</div>
                <div className="text-[clamp(2rem,8vw,3.2rem)] font-black leading-none">{fight.red}</div>
                <div className="mt-1 text-xs font-black">{tr('Rounds', 'راؤنڈ', 'الجولات')} {fight.redRounds}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 bg-[#FEF08A] px-2 py-2 text-sm font-black text-[#0F172A]">
              <span>🚨 {tr('Fouls', 'فاؤل', 'أخطاء')}: {arenaFouls}</span>
              <span>🛡️ {tr('Blocks', 'بلاک', 'صدات')}: {arenaBlocks}</span>
              <span>💨 {tr('Dodges', 'بچاؤ', 'مراوغات')}: {arenaDodges}</span>
            </div>
          </div>

          {/* Arena Stage */}
          <div className={`mt-4 overflow-hidden rounded-[24px] border-[4px] border-[#0F172A] ${fight.shake ? 'shake' : ''}`} style={{ background: 'linear-gradient(180deg,#FDE68A 0%,#BFDBFE 30%,#86EFAC 100%)' }}>
            <div className="crowd px-2 pt-2 text-center text-[22px]" aria-hidden="true">
              <span>🧑🇰🇷</span><span>👧🇵🇰</span><span>🧒🇸🇦</span><span>👩🎉</span><span>👏</span><span>🎌</span><span>👏</span>
            </div>
            <div className="relative mx-2 mt-2 rounded-[20px] border-[4px] border-[#0F172A] bg-[#22C55E] p-3" style={{ minHeight: 220 }}>
              <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-xl bg-white px-3 py-1 text-center text-xs font-black text-[#0F172A]">
                🧑‍⚖️ {tr('Referee', 'ریفری', 'الحكم')} · {arenaRefCall || tr('Ready…', 'تیار…', 'جاهز…')}
              </div>
              <div className="mt-12 flex items-end justify-between gap-2">
                <div className="flex-1 text-center">
                  <div className={`inline-block rounded-2xl border-[3px] border-[#0F172A] bg-white px-3 py-2 ${fight.playerAct === 'lunge' ? 'fighter lunge' : fight.playerAct === 'block' ? 'fighter block' : fight.playerAct === 'hit' ? 'fighter hit' : 'fighter idle'}`}>
                    <div className="text-3xl">🪖</div>
                    <div className="text-5xl">{progress.avatar}</div>
                    <div className="mx-auto mt-1 h-4 w-[72px] rounded-full border-2 border-[#0F172A] bg-[#1D4ED8]" />
                    <div className="text-[11px] font-black text-[#0F172A]">🔵 {fightMode === '2p' ? bluePlayerName : 'YOU'}</div>
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className={`inline-block rounded-2xl border-[3px] border-[#0F172A] bg-white px-3 py-2 ${fight.oppAct === 'lunge' ? 'fighter lunge' : fight.oppAct === 'hit' ? 'fighter hit' : 'fighter idle'}`}>
                    <div className="text-3xl">🪖</div>
                    <div className="text-5xl">{FIGHT_OPPONENTS[fightRound].emoji}</div>
                    <div className="mx-auto mt-1 h-4 w-[72px] rounded-full border-2 border-[#0F172A] bg-[#DC2626]" />
                    <div className="text-[11px] font-black text-[#0F172A]">🔴 {fightMode === '2p' ? redPlayerName : pick(FIGHT_OPPONENTS[fightRound].name, lang)}</div>
                  </div>
                </div>
              </div>
              {arenaPop && (
                <div className="point-pop absolute left-1/2 top-16 -translate-x-1/2">
                  {arenaPop.text} {arenaPop.side === 'blue' ? '🔵' : '🔴'}
                </div>
              )}
              {fight.burst && <span className="burst" style={{ left: '44%', top: 70 }}>💥⭐</span>}
              <div className="mt-2 rounded-xl bg-[#0F172A] p-2 text-center text-sm font-black text-white">
                {arenaCrowd || pick(['🎉 Crowd is ready!', '🎉 ہجوم تیار ہے!', '🎉 الجمهور جاهز!'] as Tri, lang)}
              </div>
            </div>
            <div className="p-3">
              <div className="rounded-2xl border-[3px] border-[#0F172A] bg-[#FEF08A] p-3 text-[#0F172A]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>🎤 {tr('Live Coach Commentary', 'لائیو کوچ کمنٹری', 'تعليق المدرب المباشر')}</b>
                  <button
                    className="rounded-full bg-white px-3 py-2 text-sm font-black text-[#0F172A] border-[3px] border-[#0F172A] min-h-[44px]"
                    onClick={() => onSpeakCoach(arenaCommentary || pick(KIKI_TIPS.arena, lang))}
                  >
                    🔊 {tr('Coach Voice', 'کوچ کی آواز', 'صوت المدرب')}
                  </button>
                </div>
                <p className="mt-2 text-[16px] font-black leading-relaxed">
                  {arenaCommentary || pick(['Press Start Match, then choose a move!', 'اسٹارٹ میچ دبائیں، پھر چال چنیں!', 'اضغط ابدأ المباراة، ثم اختر حركة!'] as Tri, lang)}
                </p>
                {arenaLog.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm font-bold">
                    {arenaLog.slice(0, 3).map((l, i) => (
                      <li key={i}>• {l}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {fight.phase === 'idle' && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button className="big-btn w-full" onClick={() => startArena(false)}>
                🥊 {t('startFight')}
              </button>
              <button className="big-btn yellow w-full" onClick={() => startArena(true)}>
                🎬 {tr('Watch Pro Match (AI vs AI)', 'پرو میچ دیکھیں', 'شاهد مباراة المحترفين')}
              </button>
            </div>
          )}

          {fight.phase === 'fighting' &&
            (fightMode === '2p' && !fight.demo ? (
              <>
                <p className="mt-4 rounded-2xl bg-[#FEF08A] border-[3px] border-[#0F172A] p-3 text-center font-black text-[#0F172A]">
                  👉 {tr('Turn:', 'باری:', 'الدور:')} {lastMover === 'blue' ? redPlayerName : bluePlayerName}
                </p>
                <div className="mt-3 rounded-2xl border-[3px] border-[#0F172A] bg-[#DBEAFE] p-3 text-[#0F172A]">
                  <b>🔵 {bluePlayerName}</b>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['Ap Chagi +1', 'Ap Chagi', '🦶'],
                      ['Dollyo +2', 'Dollyo Chagi', '🌀'],
                      ['Punch +1', 'Punch', '🥊'],
                      ['Block', 'Block', '🛡️'],
                    ].map(([label, mv, em]) => (
                      <button
                        key={mv}
                        onClick={() => arenaAttack(mv, 'blue')}
                        className="min-h-[60px] rounded-2xl border-[3px] border-[#0F172A] bg-[#1D4ED8] px-2 py-2 font-black text-white"
                      >
                        {em} {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border-[3px] border-[#0F172A] bg-[#FECACA] p-3 text-[#0F172A]">
                  <b>🔴 {redPlayerName}</b>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['Ap Chagi +1', 'Ap Chagi', '🦶'],
                      ['Dollyo +2', 'Dollyo Chagi', '🌀'],
                      ['Punch +1', 'Punch', '🥊'],
                      ['Block', 'Block', '🛡️'],
                    ].map(([label, mv, em]) => (
                      <button
                        key={mv}
                        onClick={() => arenaAttack(mv, 'red')}
                        className="min-h-[60px] rounded-2xl border-[3px] border-[#0F172A] bg-[#DC2626] px-2 py-2 font-black text-white"
                      >
                        {em} {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="ghost mt-3 w-full" onClick={stopArena}>
                  {tr('Stop Match', 'میچ روکیں', 'أوقف المباراة')}
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 text-center font-black">{fight.demo ? tr('Demo is playing — watch and learn!', 'ڈیمو چل رہا ہے!', 'العرض يعمل!') : t('chooseMove')}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ['Ap Chagi +1', 'Ap Chagi', '🦶', '#FEF08A'],
                    ['Dollyo Chagi +2', 'Dollyo Chagi', '🌀', '#FFFFFF'],
                    ['Dwit Chagi +3', 'Dwit Chagi', '🌪️', '#FEF08A'],
                    ['Punch +1', 'Punch', '🥊', '#FFFFFF'],
                    ['Block', 'Block', '🛡️', '#BFDBFE'],
                    ['Dodge', 'Dodge', '💨', '#BFDBFE'],
                  ].map(([label, mv, em, bg]) => (
                    <button
                      key={mv}
                      disabled={fight.demo}
                      onClick={() => arenaAttack(mv, 'blue')}
                      className="min-h-[64px] rounded-2xl border-[3px] border-[#0F172A] px-2 py-3 text-[16px] font-black text-[#0F172A] shadow-[0_5px_0_#0F172A]"
                      style={{ background: bg }}
                    >
                      {em} {label}
                    </button>
                  ))}
                </div>
                <button className="ghost mt-3 w-full" onClick={stopArena}>
                  {tr('Stop Match', 'میچ روکیں', 'أوقف المباراة')}
                </button>
              </>
            ))}

          {fight.phase === 'between' && (
            <div className="mt-4 rounded-2xl bg-[#FEF08A] border-[3px] border-[#0F172A] p-4 text-center text-[#0F172A]">
              <div className="text-xl font-black">
                ⏸️ Break! {tr('Round', 'راؤنڈ', 'الجولة')} {fight.round} — Blue {fight.blue} : {fight.red} Red
              </div>
              <button className="big-btn mt-3 w-full" onClick={nextArenaRound}>
                {tr('Start Next Round', 'اگلا راؤنڈ شروع کریں', 'ابدأ الجولة التالية')} ➡️
              </button>
            </div>
          )}

          {fight.phase === 'finished' && (
            <div className="mt-4 rounded-2xl bg-[#FEF08A] border-[4px] border-[#0F172A] p-4 text-center text-[#0F172A]">
              <div className="text-6xl">🏆</div>
              <h3 className="mt-1 text-2xl font-black">
                {fight.result === 'win'
                  ? `🎉 ${fightMode === '2p' ? `${bluePlayerName} Wins!` : 'Blue Wins!'}`
                  : fight.result === 'lose'
                  ? `🏅 ${fightMode === '2p' ? `${redPlayerName} Wins!` : 'Red Wins!'}`
                  : '🤝 Tie Match!'}
              </h3>
              <p className="mt-1 font-black">
                {fight.blue} — {fight.red} ({fight.blueRounds} — {fight.redRounds})
              </p>
              <label className="!text-[#0F172A] text-left">{tr('Athlete Name', 'کھلاڑی کا نام', 'اسم الرياضي')}</label>
              <input value={athleteInput} onChange={(e) => setAthleteInput(e.target.value)} placeholder={tr('Type your name, champion!', 'اپنا نام لکھیں!', 'اكتب اسمك!')} />
              <button className="big-btn mt-3 w-full" disabled={arenaSaved} onClick={saveArenaResult}>
                {arenaSaved ? `✓ ${tr('Saved to Charts!', 'محفوظ ہو گیا!', 'تم الحفظ!')}` : `💾 ${tr('Save Match & +100 XP', 'میچ محفوظ کریں +100 ایکس پی', 'حفظ المباراة +100 نقطة')} 🏆`}
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="ghost flex-1" onClick={() => startArena(false)}>
                  🔄 {tr('Play Again', 'دوبارہ کھیلیں', 'العب من جديد')}
                </button>
                <button className="ghost flex-1" onClick={onGoToProgress}>
                  📊 {tr('See Charts', 'چارٹس دیکھیں', 'شاهد الرسوم')}
                </button>
              </div>
            </div>
          )}
        </article>
      )}

      {arenaTab === 'tournament' && (
        <article className="card mx-auto max-w-[960px] p-4 sm:p-5">
          <h2 className="text-2xl font-black">🏆 {tr('Tournament Center', 'ٹورنامنٹ سینٹر', 'مركز البطولات')}</h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {tr('Play Kyorugi brackets, Poomsae rhythm contests, or 4v4 Team Battles!', 'کیوروگی بریکٹ، پومسے مقابلہ، یا ٹیم بیٹل کھیلیں!', 'العب بطولات كيوروغي، مسابقات البومساي، أو معارك الفرق!')}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              ['kyorugi', `🥊 ${tr('Kyorugi Bracket', 'کیوروگی بریکٹ', 'جدول كيوروغي')}`],
              ['poomsae', `🥋 ${tr('Poomsae Contest', 'پومسے مقابلہ', 'مسابقة البومساي')}`],
              ['team', `👥 ${tr('Team Battle', 'ٹیم بیٹل', 'معركة الفرق')}`],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => {
                  setTourneyMode(v);
                  onStopSpeak();
                }}
                aria-pressed={tourneyMode === v}
                className="rounded-full px-4 py-3 text-sm font-black min-h-[48px]"
                style={{
                  background: tourneyMode === v ? '#1D4ED8' : 'var(--surface2)',
                  color: tourneyMode === v ? '#FFFFFF' : 'var(--text)',
                  border: '3px solid var(--line)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tourneyMode === 'kyorugi' && !tourney && (
            <div>
              <p className="mt-4 font-black">{tr('Choose players:', 'کھلاڑی چنیں:', 'اختر عدد اللاعبين:')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([4, 8] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setTourneySize(n)}
                    aria-pressed={tourneySize === n}
                    className="rounded-full px-5 py-3 text-base font-black min-h-[48px]"
                    style={{ background: tourneySize === n ? '#1D4ED8' : '#FFFFFF', color: tourneySize === n ? '#FFFFFF' : '#0F172A', border: '3px solid #0F172A' }}
                  >
                    {n} {tr('Players', 'کھلاڑی', 'لاعبين')}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {tourneyPlayers.slice(0, tourneySize).map((p, i) => (
                  <div key={i} className="rounded-2xl border-[3px] border-[var(--line)] bg-[var(--surface2)] p-3">
                    <label className="!m-0 mb-1">{tr('Player', 'کھلاڑی', 'اللاعب')} {i + 1}</label>
                    <input value={p.name} onChange={(e) => setTourneyPlayers((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {TOURNEY_AVATARS.map((a) => (
                        <button
                          key={a}
                          onClick={() => setTourneyPlayers((ps) => ps.map((x, j) => (j === i ? { ...x, avatar: a } : x)))}
                          className="grid h-10 w-10 place-items-center rounded-full text-xl"
                          style={{ border: p.avatar === a ? '3px solid #FACC15' : '2px solid #0F172A', background: '#FFFFFF' }}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="big-btn mt-4 w-full" onClick={startTournament}>
                🏆 {tr('Start Tournament', 'ٹورنامنٹ شروع کریں', 'ابدأ البطولة')}
              </button>
            </div>
          )}

          {tourneyMode === 'kyorugi' && tourney && tourneyChampionShown && tourneyChampion &&
            renderMedalCeremony('kyorugi', () => { setTourneyChampionShown(false); setCeremony(null); }, () => { setCeremony(null); newTournament(); })}

          {tourneyMode === 'kyorugi' && tourney && !tourneyChampionShown && (
            <div>
              {[1, 2, 3].filter((r) => tourney.matches.some((m) => m.round === r)).map((round) => (
                <div key={round} className="mt-4">
                  <h3 className="font-black">{round === 3 ? '🏆 Final' : round === 2 ? '⭐ Semi-Finals' : tourney.size === 8 ? '🥊 Quarter-Finals' : '⭐ Semi-Finals'}</h3>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {tourney.matches
                      .filter((m) => m.round === round)
                      .map((m) => {
                        const b = m.blue !== null ? tourney.players[m.blue] : null;
                        const r = m.red !== null ? tourney.players[m.red] : null;
                        return (
                          <div key={m.id} className="rounded-2xl border-[3px] border-[#0F172A] bg-white p-3 text-[#0F172A]">
                            <div className="flex items-center justify-between gap-2">
                              <b>{pick(m.label, lang)}</b>
                              {m.winner !== null && <span className="text-xs font-black">🏆 {tourney.players[m.winner].name}</span>}
                            </div>
                            <div className="mt-2 space-y-1 font-black">
                              <div className="flex justify-between rounded-xl bg-[#DBEAFE] px-3 py-2">
                                <span>🔵 {b ? `${b.avatar} ${b.name}` : 'TBD'}</span>
                                <span>{m.winner !== null ? m.blueScore : '—'}</span>
                              </div>
                              <div className="flex justify-between rounded-xl bg-[#FECACA] px-3 py-2">
                                <span>🔴 {r ? `${r.avatar} ${r.name}` : 'TBD'}</span>
                                <span>{m.winner !== null ? m.redScore : '—'}</span>
                              </div>
                            </div>
                            {m.winner === null && b && r && (
                              <button className="big-btn mt-3 w-full" onClick={() => openTourneyMatch(m.id)}>
                                🥊 {tr('Play Match', 'میچ کھیلیں', 'العب المباراة')}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
              {tourneyMatch && tourneyMatch.blue !== null && tourneyMatch.red !== null && tourneyFight.phase !== 'done' && (
                <div className="mt-4 rounded-2xl border-[4px] border-[#0F172A] bg-[#FEF08A] p-4 text-[#0F172A]">
                  <h3 className="text-xl font-black">
                    🥊 {tourney.players[tourneyMatch.blue].name} vs {tourney.players[tourneyMatch.red].name}
                  </h3>
                  <div className="mt-3 flex items-center justify-center gap-3 text-center">
                    <div className="flex-1 rounded-2xl bg-[#1D4ED8] p-3 text-white">
                      <div className="text-sm font-black">🔵 {tourney.players[tourneyMatch.blue].name}</div>
                      <div className="text-4xl font-black">{tourneyFight.blue}</div>
                    </div>
                    <div className="font-black">⏱ {tourneyFight.time}s</div>
                    <div className="flex-1 rounded-2xl bg-[#DC2626] p-3 text-white">
                      <div className="text-sm font-black">🔴 {tourney.players[tourneyMatch.red].name}</div>
                      <div className="text-4xl font-black">{tourneyFight.red}</div>
                    </div>
                  </div>
                  {tourneyFight.phase === 'idle' ? (
                    <button className="big-btn mt-3 w-full" onClick={() => setTourneyFight((f) => ({ ...f, phase: 'fighting' }))}>
                      ▶️ {tr('Start 45-Second Match', 'میچ شروع کریں', 'ابدأ المباراة')}
                    </button>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      <div className="grid grid-cols-3 gap-2">
                        {([['Body +2', 2], ['Head +3', 3], ['Punch +1', 1]] as const).map(([l, pts]) => (
                          <button key={l} onClick={() => tourneyScore('blue', pts)} className="rounded-xl bg-[#1D4ED8] py-3 font-black text-white">
                            🔵 {l}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {([['Body +2', 2], ['Head +3', 3], ['Punch +1', 1]] as const).map(([l, pts]) => (
                          <button key={l} onClick={() => tourneyScore('red', pts)} className="rounded-xl bg-[#DC2626] py-3 font-black text-white">
                            🔴 {l}
                          </button>
                        ))}
                      </div>
                      <button className="ghost w-full" onClick={finishTourneyMatch}>
                        🏁 {tr('Finish Match', 'میچ ختم کریں', 'أنهِ المباراة')}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {tourneyResult && !tourneyResult.isFinal && (
                <div className="mt-4 rounded-2xl border-[3px] border-[#0F172A] bg-white p-4 text-center text-[#0F172A]">
                  <p className="font-black">
                    🏆 {tourney.players[tourneyResult.winner].name} advances! ({tourneyResult.blue} — {tourneyResult.red})
                  </p>
                  <button className="big-btn mt-3" onClick={() => { setTourneyMatchId(null); setTourneyResult(null); }}>
                    {tr('Back to Bracket', 'واپس', 'عودة')}
                  </button>
                </div>
              )}
              <button className="ghost mt-4" onClick={newTournament}>
                🔄 {tr('New Tournament', 'نیا ٹورنامنٹ', 'بطولة جديدة')}
              </button>
            </div>
          )}

          {tourneyMode === 'poomsae' && (
            <div>
              {!poomsaeContest && (
                <div>
                  <p className="mt-4 font-black">{tr('4 players — perform 5 steps in rhythm!', '4 کھلاڑی — تال میں 5 قدم کریں!', '4 لاعبين — 5 خطوات بإيقاع!')}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {poomsaePlayers.map((p, i) => (
                      <div key={i} className="rounded-2xl border-[3px] border-[var(--line)] bg-[var(--surface2)] p-3">
                        <label className="!m-0 mb-1">Player {i + 1}</label>
                        <input value={p.name} onChange={(e) => setPoomsaePlayers((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <div className="mt-2 flex flex-wrap gap-1">
                          {POOMSAE_CHOICES.map((c, ci) => (
                            <button
                              key={ci}
                              onClick={() => setPoomsaePlayers((ps) => ps.map((x, j) => (j === i ? { ...x, poomsae: ci } : x)))}
                              className="rounded-full px-3 py-1.5 text-xs font-black border-2 border-[#0F172A]"
                              style={{ background: p.poomsae === ci ? '#1D4ED8' : '#FFFFFF', color: p.poomsae === ci ? '#FFFFFF' : '#0F172A' }}
                            >
                              {pick(c.name, lang)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="big-btn mt-4 w-full" onClick={startPoomsaeContest}>
                    🥋 {tr('Start Poomsae Contest', 'پومسے مقابلہ شروع کریں', 'ابدأ مسابقة البومساي')}
                  </button>
                </div>
              )}
              {poomsaeContest && poomsaeChampionShown && poomsaeChampion &&
                renderMedalCeremony('poomsae', () => { setPoomsaeChampionShown(false); setCeremony(null); }, () => { setCeremony(null); newPoomsaeContest(); })}
              {poomsaeContest && !poomsaeChampionShown && (
                <div>
                  {[1, 2].map((round) => (
                    <div key={round} className="mt-4 grid gap-3 md:grid-cols-2">
                      {poomsaeContest.matches
                        .filter((m) => m.round === round)
                        .map((m) => {
                          const b = m.blue !== null ? poomsaeContest.players[m.blue] : null;
                          const r = m.red !== null ? poomsaeContest.players[m.red] : null;
                          return (
                            <div key={m.id} className="rounded-2xl border-[3px] border-[#0F172A] bg-white p-3 text-[#0F172A]">
                              <b>{pick(m.label, lang)}</b>
                              <div className="mt-2 space-y-1 font-black">
                                <div className="flex justify-between rounded-xl bg-[#DBEAFE] px-3 py-2">
                                  <span>{b ? `${b.avatar} ${b.name}` : 'TBD'}</span>
                                  <span>{m.winner !== null ? m.blueScore.toFixed(1) : '—'}</span>
                                </div>
                                <div className="flex justify-between rounded-xl bg-[#FECACA] px-3 py-2">
                                  <span>{r ? `${r.avatar} ${r.name}` : 'TBD'}</span>
                                  <span>{m.winner !== null ? m.redScore.toFixed(1) : '—'}</span>
                                </div>
                              </div>
                              {m.winner === null && b && r && !poomsaePerf && (
                                <button className="big-btn mt-3 w-full" onClick={() => openPoomsaeMatch(m.id)}>
                                  🥋 {tr('Perform Poomsae', 'پومسے کریں', 'أدِّ البومساي')}
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                  {poomsaePerf && poomsaeMatch && (
                    <div className="mt-4 rounded-2xl border-[4px] border-[#0F172A] bg-[#FEF08A] p-4 text-[#0F172A]">
                      <h3 className="text-xl font-black">🥋 {poomsaeContest.players[poomsaePerf.playerIdx].name}</h3>
                      <div className="mt-3 grid gap-2">
                        {POOMSAE_CHOICES[poomsaeContest.players[poomsaePerf.playerIdx].poomsae].steps.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-2xl border-[3px] border-[#0F172A] px-3 py-2 font-black"
                            style={{ background: poomsaePerf.phase === 'lit' && i === poomsaePerf.step ? '#FDE047' : '#FFFFFF' }}
                          >
                            <span>{i + 1}. {pick(s, lang)}</span>
                            <span>{i < poomsaePerf.results.length ? poomsaePerf.results[i] : poomsaePerf.phase === 'lit' && i === poomsaePerf.step ? 'NOW!' : ''}</span>
                          </div>
                        ))}
                      </div>
                      {poomsaePerf.phase === 'ready' && (
                        <button className="big-btn mt-3 w-full" onClick={() => setPoomsaePerf((p) => (p ? { ...p, phase: 'lit', litAt: Date.now() } : p))}>
                          ▶️ {tr('Start Performance', 'شروع کریں', 'ابدأ الأداء')}
                        </button>
                      )}
                      {poomsaePerf.phase === 'lit' && (
                        <button className="big-btn yellow mt-3 w-full" onClick={doPoomsaeMove}>
                          🥋 {tr('Do Move!', 'چال کریں!', 'نفّذ الحركة!')}
                        </button>
                      )}
                      {poomsaePerf.phase === 'judges' && (
                        <div className="mt-3 text-center">
                          <div className="font-black text-xl">
                            🧑‍⚖️ Score: {poomsaePerf.final.toFixed(1)} ({poomsaePerf.judges.map((j) => j.toFixed(1)).join(' · ')})
                          </div>
                          <button className="big-btn mt-3 w-full" onClick={finishPoomsaePerf}>
                            {poomsaePerf.playerIdx === poomsaeMatch.blue ? '➡️ Next Performer' : '🏁 Finish Match'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button className="ghost mt-4" onClick={newPoomsaeContest}>
                    🔄 {tr('New Contest', 'نیا مقابلہ', 'مسابقة جديدة')}
                  </button>
                </div>
              )}
            </div>
          )}

          {tourneyMode === 'team' && (
            <div>
              {!teamBattle && (
                <div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border-[3px] border-[#0F172A] bg-[#DBEAFE] p-3 text-[#0F172A]">
                      <h3 className="font-black">🔵 Blue Team</h3>
                      {teamBlue.map((n, i) => (
                        <input key={i} className="mt-2" value={n} onChange={(e) => setTeamBlue((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                      ))}
                    </div>
                    <div className="rounded-2xl border-[3px] border-[#0F172A] bg-[#FECACA] p-3 text-[#0F172A]">
                      <h3 className="font-black">🔴 Red Team</h3>
                      {teamRed.map((n, i) => (
                        <input key={i} className="mt-2" value={n} onChange={(e) => setTeamRed((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                      ))}
                    </div>
                  </div>
                  <button className="big-btn mt-4 w-full" onClick={startTeamBattle}>
                    👥 {tr('Start Team Battle', 'ٹیم بیٹل شروع کریں', 'ابدأ معركة الفرق')}
                  </button>
                </div>
              )}
              {teamBattle && teamChampionShown && teamBattle.winner &&
                renderMedalCeremony('team', () => { setTeamChampionShown(false); setCeremony(null); }, () => { setCeremony(null); newTeamBattle(); })}
              {teamBattle && !teamChampionShown && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-stretch overflow-hidden rounded-2xl border-[4px] border-[#0F172A] text-center">
                    <div className="flex-1 bg-[#1D4ED8] p-3 text-white">
                      <div className="text-xs font-black">🔵 BLUE TEAM</div>
                      <div className="text-3xl font-black">{teamBattle.blueTotal}</div>
                    </div>
                    <div className="bg-[#0F172A] px-4 py-3 text-white font-black">
                      Round {teamBattle.round}/4 · ⏱ {teamBattle.time}s
                    </div>
                    <div className="flex-1 bg-[#DC2626] p-3 text-white">
                      <div className="text-xs font-black">🔴 RED TEAM</div>
                      <div className="text-3xl font-black">{teamBattle.redTotal}</div>
                    </div>
                  </div>
                  {teamBattle.phase === 'idle' && (
                    <button className="big-btn w-full" onClick={() => setTeamBattle((f) => (f ? { ...f, phase: 'fighting' } : f))}>
                      ▶️ Start Round {teamBattle.round} ({teamBlue[teamBattle.round - 1]} vs {teamRed[teamBattle.round - 1]})
                    </button>
                  )}
                  {teamBattle.phase === 'fighting' && (
                    <div className="space-y-2 rounded-2xl border-[3px] border-[#0F172A] bg-[#FEF08A] p-4 text-[#0F172A]">
                      <div className="text-center font-black">
                        {teamBlue[teamBattle.round - 1]} ({teamBattle.roundBlue}) vs ({teamBattle.roundRed}) {teamRed[teamBattle.round - 1]}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {([['Body +2', 2], ['Head +3', 3], ['Punch +1', 1]] as const).map(([l, pts]) => (
                          <button key={l} onClick={() => teamScore('blue', pts)} className="rounded-xl bg-[#1D4ED8] py-3 font-black text-white">
                            🔵 {l}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {([['Body +2', 2], ['Head +3', 3], ['Punch +1', 1]] as const).map(([l, pts]) => (
                          <button key={l} onClick={() => teamScore('red', pts)} className="rounded-xl bg-[#DC2626] py-3 font-black text-white">
                            🔴 {l}
                          </button>
                        ))}
                      </div>
                      <button className="ghost w-full" onClick={finishTeamRound}>
                        🏁 End Round
                      </button>
                    </div>
                  )}
                  {teamBattle.phase === 'between' && (
                    <button className="big-btn w-full" onClick={nextTeamRound}>
                      ➡️ Next Round
                    </button>
                  )}
                  <button className="ghost" onClick={newTeamBattle}>
                    🔄 New Team Battle
                  </button>
                </div>
              )}
            </div>
          )}
        </article>
      )}
    </div>
  );
};
