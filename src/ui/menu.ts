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
  renderHeader('  TYPRAC — 타자 연습  ');
  writeLine();
  writeLine('  ' + bold('언어 선택:'));
  writeLine();
  writeLine('    ' + yellow('[1]') + '  English (영어)');
  writeLine('    ' + yellow('[2]') + '  한국어');
  writeLine();
  renderDivider();
  writeLine('  ' + dim('[Esc/Ctrl+C] 종료'));

  const key = await waitKey(['1', '2']);
  if (key === null) return null;
  return key === '1' ? 'en' : 'ko';
}

export async function selectDifficulty(): Promise<Difficulty | null> {
  clearScreen();
  renderHeader('  TYPRAC — 난이도 선택  ');
  writeLine();
  writeLine('  ' + bold('난이도 선택:'));
  writeLine();
  writeLine('    ' + green('[1]') + '  쉬움   — 짧고 간단한 문장');
  writeLine('    ' + yellow('[2]') + '  보통   — 구두점 포함 일반 문장');
  writeLine('    ' + cyan('[3]') + '  어려움 — 기호·숫자 포함 복잡한 문장');
  writeLine();
  renderDivider();
  writeLine('  ' + dim('[Esc/Ctrl+C] 종료'));

  const key = await waitKey(['1', '2', '3']);
  if (key === null) return null;
  const map: Record<string, Difficulty> = { '1': 'easy', '2': 'medium', '3': 'hard' };
  return map[key];
}
