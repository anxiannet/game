import { MAX_WAVES } from './config';

const PROGRESS_KEY = 'dingbuzhule:progress:v1';

type StoredProgress = {
  currentWave: number;
};

function clampWave(wave: number): number {
  return Math.max(1, Math.min(MAX_WAVES, Math.floor(wave)));
}

export function loadCurrentWave(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return 1;
    const data = JSON.parse(raw) as Partial<StoredProgress>;
    return clampWave(Number(data.currentWave) || 1);
  } catch {
    return 1;
  }
}

export function saveCurrentWave(wave: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ currentWave: clampWave(wave) } satisfies StoredProgress));
}

export function resetCurrentWave(): void {
  saveCurrentWave(1);
}
