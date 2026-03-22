import type { Language } from "../types";

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

// Count actual keystrokes for a Korean syllable block
// e.g. "한" (ㅎ+ㅏ+ㄴ) = 3, "가" (ㄱ+ㅏ) = 2
function syllableKeystrokes(ch: string): number {
  const code = ch.codePointAt(0)!;
  if (code < HANGUL_START || code > HANGUL_END) return 1;
  const offset = code - HANGUL_START;
  const jongseong = offset % 28;
  return jongseong > 0 ? 3 : 2;
}

export function countKeystrokes(chars: string[], language: Language): number {
  if (language === "en") return chars.length;
  return chars.reduce((sum, ch) => sum + syllableKeystrokes(ch), 0);
}

export function calcKPM(keystrokes: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round(keystrokes / minutes);
}

export function calcSpeed(
  typedChars: string[],
  elapsedMs: number,
  language: Language,
): number {
  const keystrokes = countKeystrokes(typedChars, language);
  return calcKPM(keystrokes, elapsedMs);
}

export function calcAccuracy(correctChars: number, totalTyped: number): number {
  if (totalTyped === 0) return 100;
  return Math.round((correctChars / totalTyped) * 1000) / 10;
}

export function countCorrect(typedChars: string[], targetText: string): number {
  const target = [...targetText];
  let correct = 0;
  for (let i = 0; i < typedChars.length; i++) {
    if (typedChars[i] === target[i]) correct++;
  }
  return correct;
}
