import type { Language, Difficulty } from '../types.js';
import { enEasy } from './en-easy.js';
import { enMedium } from './en-medium.js';
import { enHard } from './en-hard.js';
import { koEasy } from './ko-easy.js';
import { koMedium } from './ko-medium.js';
import { koHard } from './ko-hard.js';

const texts: Record<Language, Record<Difficulty, string[]>> = {
  en: { easy: enEasy, medium: enMedium, hard: enHard },
  ko: { easy: koEasy, medium: koMedium, hard: koHard },
};

export function getText(lang: Language, difficulty: Difficulty): string {
  const pool = texts[lang][difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}
