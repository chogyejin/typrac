import type { Language, Difficulty } from '../types';
import { enEasy } from './en-easy';
import { enMedium } from './en-medium';
import { enHard } from './en-hard';
import { koEasy } from './ko-easy';
import { koMedium } from './ko-medium';
import { koHard } from './ko-hard';

const texts: Record<Language, Record<Difficulty, string[]>> = {
  en: { easy: enEasy, medium: enMedium, hard: enHard },
  ko: { easy: koEasy, medium: koMedium, hard: koHard },
};

export function getText(lang: Language, difficulty: Difficulty): string {
  const pool = texts[lang][difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}
