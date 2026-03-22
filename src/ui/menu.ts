import type { Language, Difficulty } from '../types.js';
import {
  clearScreen,
  writeLine,
  bold,
  cyan,
  yellow,
  dim,
  green,
  renderDivider,
  renderHeader,
} from './renderer.js';
import { isCtrlC, isEsc } from '../engine/input.js';

function waitKey(options: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function onData(key: string): void {
      if (isCtrlC(key) || isEsc(key)) {
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(null);
        return;
      }
      if (options.includes(key)) {
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(key);
      }
    }

    process.stdin.on('data', onData);
  });
}

export async function selectLanguage(): Promise<Language | null> {
  clearScreen();
  renderHeader('  TYPRAC — Typing Practice  ');
  writeLine();
  writeLine('  ' + bold('Select Language:'));
  writeLine();
  writeLine('    ' + yellow('[1]') + '  English');
  writeLine('    ' + yellow('[2]') + '  한국어 (Korean)');
  writeLine();
  renderDivider();
  writeLine('  ' + dim('[Esc/Ctrl+C] Quit'));

  const key = await waitKey(['1', '2']);
  if (key === null) return null;
  return key === '1' ? 'en' : 'ko';
}

export async function selectDifficulty(): Promise<Difficulty | null> {
  clearScreen();
  renderHeader('  TYPRAC — Select Difficulty  ');
  writeLine();
  writeLine('  ' + bold('Select Difficulty:'));
  writeLine();
  writeLine('    ' + green('[1]') + '  Easy    — short, simple phrases');
  writeLine('    ' + yellow('[2]') + '  Medium  — full sentences with punctuation');
  writeLine('    ' + cyan('[3]') + '  Hard    — complex text with symbols & numbers');
  writeLine();
  renderDivider();
  writeLine('  ' + dim('[Esc/Ctrl+C] Quit'));

  const key = await waitKey(['1', '2', '3']);
  if (key === null) return null;
  const map: Record<string, Difficulty> = { '1': 'easy', '2': 'medium', '3': 'hard' };
  return map[key];
}
