import { Lang } from '../types/taekwondo';

const AUDIO_CACHE_NAME = 'tkd-offline-audio-v1';

// Synthesize a clean, friendly PCM WAV buffer for offline CacheStorage playback
function generateCueWavBuffer(frequencies: number[], stepDurationSec = 0.16, sampleRate = 22050): ArrayBuffer {
  const samplesPerStep = Math.floor(sampleRate * stepDurationSec);
  const totalSamples = frequencies.length * samplesPerStep;
  const dataSize = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let fIdx = 0; fIdx < frequencies.length; fIdx++) {
    const freq = frequencies[fIdx];
    for (let i = 0; i < samplesPerStep; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, i / 400) * Math.max(0, 1 - i / samplesPerStep);
      const sample = freq > 0 ? Math.sin(2 * Math.PI * freq * t) * 0.25 * env : 0;
      view.setInt16(offset, Math.max(-1, Math.min(1, sample)) * 32767, true);
      offset += 2;
    }
  }
  return buffer;
}

const EXERCISE_TONE_PATTERNS: Record<string, number[]> = {
  lesson: [523.25, 659.25, 783.99],
  move: [440, 587.33, 880],
  poomsae: [392, 523.25, 659.25, 783.99],
  kiki: [587.33, 783.99, 987.77],
  coach: [349.23, 440, 523.25],
  quiz: [523.25, 659.25],
};

export type ExerciseAudioItem = {
  id: string;
  category: keyof typeof EXERCISE_TONE_PATTERNS;
};

export const ALL_OFFLINE_AUDIO_KEYS: ExerciseAudioItem[] = [
  ...Array.from({ length: 15 }, (_, i) => ({ id: `belt-lesson-${i}`, category: 'lesson' as const })),
  ...Array.from({ length: 15 }, (_, i) =>
    [0, 1, 2, 3].map((m) => ({ id: `belt-${i}-move-${m}`, category: 'move' as const }))
  ).flat(),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `poomsae-step-${i}`, category: 'poomsae' as const })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `movie-track-${i}`, category: 'coach' as const })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `coachtv-track-${i}`, category: 'coach' as const })),
  ...Array.from({ length: 15 }, (_, i) => ({ id: `kiki-guide-${i}`, category: 'kiki' as const })),
  ...Array.from({ length: 5 }, (_, i) => ({ id: `kiki-tenet-${i}`, category: 'kiki' as const })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `kiki-count-${i}`, category: 'kiki' as const })),
  ...Array.from({ length: 8 }, (_, i) => ({ id: `kiki-cmd-${i}`, category: 'kiki' as const })),
  { id: 'kiki-welcome', category: 'kiki' },
];

let activeAudioEl: HTMLAudioElement | null = null;

export function stopAllAudio() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.src = '';
    } catch {
      // ignore
    }
    activeAudioEl = null;
  }
}

export async function getCachedAudioCount(): Promise<number> {
  try {
    if (!('caches' in window)) return 0;
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}

export async function precacheAllExerciseAudio(
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const total = ALL_OFFLINE_AUDIO_KEYS.length;
  if (!('caches' in window)) {
    onProgress?.(total, total);
    return total;
  }
  const cache = await caches.open(AUDIO_CACHE_NAME);
  let done = 0;
  for (const item of ALL_OFFLINE_AUDIO_KEYS) {
    const url = `/offline-audio/${item.id}.wav`;
    const existing = await cache.match(url);
    if (!existing) {
      const pattern = EXERCISE_TONE_PATTERNS[item.category] || EXERCISE_TONE_PATTERNS.move;
      const wav = generateCueWavBuffer(pattern, 0.14);
      const res = new Response(wav, {
        status: 200,
        headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'max-age=31536000' },
      });
      await cache.put(url, res);
    }
    done++;
    onProgress?.(done, total);
  }
  return done;
}

export async function playCachedCue(exerciseId: string, category: keyof typeof EXERCISE_TONE_PATTERNS = 'move') {
  try {
    if ('caches' in window) {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const url = `/offline-audio/${exerciseId}.wav`;
      let res = await cache.match(url);
      if (!res) {
        const wav = generateCueWavBuffer(EXERCISE_TONE_PATTERNS[category] || EXERCISE_TONE_PATTERNS.move, 0.12);
        res = new Response(wav, { status: 200, headers: { 'Content-Type': 'audio/wav' } });
        await cache.put(url, res.clone());
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const audio = new Audio(objUrl);
      audio.volume = 0.28;
      activeAudioEl = audio;
      audio.onended = () => URL.revokeObjectURL(objUrl);
      await audio.play().catch(() => {});
    }
  } catch {
    // Fallback silent
  }
}

export function speakInstruction(
  text: string,
  options: {
    lang: Lang;
    rate?: number;
    pitch?: number;
    exerciseId?: string;
    category?: keyof typeof EXERCISE_TONE_PATTERNS;
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  stopAllAudio();
  const { lang, rate = 1, pitch = 1, exerciseId, category = 'move', onStart, onEnd } = options;

  if (exerciseId) {
    void playCachedCue(exerciseId, category);
  }

  if (!('speechSynthesis' in window)) {
    onStart?.();
    setTimeout(() => onEnd?.(), 1400);
    return;
  }

  try {
    const u = new SpeechSynthesisUtterance(text);
    const map: Record<Lang, string> = { en: 'en-US', ur: 'ur-PK', ar: 'ar-SA' };
    u.lang = map[lang];
    u.rate = rate;
    u.pitch = pitch;

    const voices = window.speechSynthesis.getVoices();
    const prefix = lang === 'ur' ? 'ur' : lang === 'ar' ? 'ar' : 'en';
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));
    if (match) u.voice = match;

    u.onstart = () => onStart?.();
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();

    onStart?.();
    window.speechSynthesis.speak(u);
  } catch {
    onEnd?.();
  }
}
