import type { Language, Difficulty, Mode } from '../types';
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
} from './renderer';
import { isCtrlC, isEsc } from '../engine/input';

function waitKey(options: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function onData(key: string): void {
      if (isCtrlC(key)) {
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
  writeLine('  ' + dim('[Ctrl+C] 종료'));

  const key = await waitKey(['1', '2']);
  if (key === null) return null;
  return key === '1' ? 'en' : 'ko';
}

export async function selectMode(lang: Language): Promise<Mode | null> {
  clearScreen();
  renderHeader('  TYPRAC — 모드 선택  ');
  writeLine();
  writeLine('  ' + bold('모드 선택:'));
  writeLine();
  writeLine('    ' + yellow('[1]') + '  일반 모드     — 단어·문장 연습');
  if (lang === 'ko') {
    writeLine('    ' + cyan('[2]') + '  자모음 모드   — 낱자(자음·모음) 연습');
  } else {
    writeLine('    ' + cyan('[2]') + '  알파벳 모드   — 낱자(알파벳·숫자) 연습');
  }
  writeLine();
  renderDivider();
  writeLine('  ' + dim('[Ctrl+C] 종료'));

  const key = await waitKey(['1', '2']);
  if (key === null) return null;
  return key === '1' ? 'normal' : 'jamo';
}

export async function selectDifficulty(mode: Mode = 'normal'): Promise<Difficulty | null> {
  clearScreen();
  renderHeader('  TYPRAC — 난이도 선택  ');
  writeLine();
  writeLine('  ' + bold('난이도 선택:'));
  writeLine();
  if (mode === 'jamo') {
    writeLine('    ' + green('[1]') + '  쉬움   — 기본 자음 / 소문자');
    writeLine('    ' + yellow('[2]') + '  보통   — 자음+모음 / 대소문자');
    writeLine('    ' + cyan('[3]') + '  어려움 — 쌍자음+복합모음 / 대소문자+숫자');
  } else {
    writeLine('    ' + green('[1]') + '  쉬움   — 짧고 간단한 문장');
    writeLine('    ' + yellow('[2]') + '  보통   — 구두점 포함 일반 문장');
    writeLine('    ' + cyan('[3]') + '  어려움 — 기호·숫자 포함 복잡한 문장');
  }
  writeLine();
  renderDivider();
  writeLine('  ' + dim('[Ctrl+C] 종료'));

  const key = await waitKey(['1', '2', '3']);
  if (key === null) return null;
  const map: Record<string, Difficulty> = { '1': 'easy', '2': 'medium', '3': 'hard' };
  return map[key];
}
