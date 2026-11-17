export type Lang = "en" | "ur" | "ar";
export type Tri = [string, string, string];

export type Settings = {
  organization: string;
  poomsaeSystem: string;
  language: string;
  beltNames: string[];
};

export type FightResult = {
  athlete: string;
  blue: number;
  red: number;
  winner: string;
  rounds: number;
  date: string;
  moves: string[];
};

export type Progress = {
  profileId: string;
  xp: number;
  lives: number;
  streak: number;
  completedLessons: number[];
  movieWatched: number[];
  settings: Settings;
  theme: "light" | "dark";
  sound: boolean;
  avatar: string;
  questClaimed: boolean;
  quizWins: number;
  language: Lang;
  autoRead: boolean;
  speechRate: number;
  sessions: number;
  bestReaction: number;
  lessonDates: Record<string, string>;
  athleteName: string;
  fightResults: FightResult[];
  medals: { gold: number; silver: number; bronze: number };
  updatedAt: string;
};

export type LeaderboardEntry = {
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
};

export type SyncOp = {
  opId: string;
  type: "STATE_SNAPSHOT" | "RESET";
  timestamp: string;
  payload: Progress;
};

export type TPlayer = { name: string; avatar: string };
export type TMatch = {
  id: number;
  round: number;
  label: Tri;
  blue: number | null;
  red: number | null;
  blueFrom: number | null;
  redFrom: number | null;
  blueScore: number;
  redScore: number;
  winner: number | null;
};

export type CoachTvStep = {
  stance: Tri;
  tech: Tri;
  arrow: string;
  badge: Tri;
  stanceHow: Tri;
  moveHow: Tri;
  category: Tri;
  mistake: Tri;
  subtitle: Tri;
  kick: boolean;
  hogu: boolean;
};

export type Know = {
  meaning: Tri;
  desc: Tri;
  tech: [string, Tri, Tri][];
  terms: Tri[];
  poomsae: Tri;
  safety: Tri[];
  fun: Tri;
  try: Tri;
};

export type QItem = { q: Tri; a: Tri[] };

export type BeltDeepGuide = {
  beltIndex: number;
  koreanRank: Tri;
  kikiIntro: Tri;
  symbolism: Tri;
  poomsaeMeaning: Tri;
  moveCount: number;
  spiritQuote: Tri;
  kikiChallengeQ: Tri;
  kikiChallengeOptions: Tri[];
  kikiChallengeAnswer: number;
  kikiPraise: Tri;
};

export type TenetItem = {
  emoji: string;
  korean: string;
  title: Tri;
  meaning: Tri;
  kikiLine: Tri;
};

export type KoreanCountItem = {
  num: number;
  korean: string;
  phonetic: string;
  word: Tri;
};

export type CommandItem = {
  emoji: string;
  korean: string;
  title: Tri;
  action: Tri;
};

