import type { Language } from '../types.js';

export function calcWPM(totalChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round(totalChars / 5 / minutes);
}

export function calcKPM(totalSyllables: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round(totalSyllables / minutes);
}

export function calcSpeed(
  totalTyped: number,
  elapsedMs: number,
  language: Language,
): number {
  if (language === 'ko') return calcKPM(totalTyped, elapsedMs);
  return calcWPM(totalTyped, elapsedMs);
}

export function calcAccuracy(
  correctChars: number,
  totalTyped: number,
): number {
  if (totalTyped === 0) return 100;
  return Math.round((correctChars / totalTyped) * 1000) / 10;
}

export function countCorrect(
  typedChars: string[],
  targetText: string,
): number {
  const target = [...targetText];
  let correct = 0;
  for (let i = 0; i < typedChars.length; i++) {
    if (typedChars[i] === target[i]) correct++;
  }
  return correct;
}
