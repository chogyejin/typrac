import type { Language, Difficulty } from '../types.js';

const KO_CONSONANTS_BASIC = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const KO_CONSONANTS_DOUBLE = ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'];
const KO_VOWELS_BASIC = ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅐ', 'ㅔ'];
const KO_VOWELS_COMPLEX = ['ㅑ', 'ㅕ', 'ㅛ', 'ㅠ', 'ㅒ', 'ㅖ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅟ', 'ㅢ'];

const EN_LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const EN_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const EN_DIGITS = '0123456789'.split('');

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSequence(pool: string[], count: number): string {
  const items: string[] = [];
  for (let i = 0; i < count; i++) {
    items.push(pickRandom(pool));
  }
  return items.join(' ');
}

export function getJamoText(lang: Language, difficulty: Difficulty): string {
  if (lang === 'ko') {
    const count = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 28 : 36;
    if (difficulty === 'easy') {
      return generateSequence(KO_CONSONANTS_BASIC, count);
    } else if (difficulty === 'medium') {
      return generateSequence([...KO_CONSONANTS_BASIC, ...KO_VOWELS_BASIC], count);
    } else {
      return generateSequence([...KO_CONSONANTS_BASIC, ...KO_CONSONANTS_DOUBLE, ...KO_VOWELS_BASIC, ...KO_VOWELS_COMPLEX], count);
    }
  } else {
    const count = difficulty === 'easy' ? 24 : difficulty === 'medium' ? 32 : 40;
    if (difficulty === 'easy') {
      return generateSequence(EN_LOWER, count);
    } else if (difficulty === 'medium') {
      return generateSequence([...EN_LOWER, ...EN_UPPER], count);
    } else {
      return generateSequence([...EN_LOWER, ...EN_UPPER, ...EN_DIGITS], count);
    }
  }
}
