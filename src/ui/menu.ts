import type { Language, Difficulty, Mode } from '../types';
import {
  clearScreen,
  writeLine,
  bold,
  cyan,
  yellow,
  dim,
  green,
  white,
  renderDivider,
  renderHeader,
} from './renderer';
import { isCtrlC } from '../engine/input';

const ARROW_UP = '\x1b[A';
const ARROW_DOWN = '\x1b[B';

interface Option {
  label: string;
  description: string;
}

function renderMenu(title: string, subtitle: string, options: Option[], selectedIndex: number): void {
  clearScreen();
  renderHeader(title);
  writeLine();
  writeLine('  ' + bold(subtitle));
  writeLine();

  options.forEach((opt, i) => {
    const num = dim(`[${i + 1}]`);
    if (i === selectedIndex) {
      writeLine('    ' + bold(cyan('❯')) + ' ' + num + '  ' + bold(white(opt.label)) + dim('  ' + opt.description));
    } else {
      writeLine('      ' + num + '  ' + opt.label + dim('  ' + opt.description));
    }
  });

  writeLine();
  renderDivider();
  writeLine('  ' + dim('[↑↓] 이동   [Enter] 선택   [숫자키] 직접 선택   [Ctrl+C] 종료'));
}

function selectOption(
  title: string,
  subtitle: string,
  options: Option[],
): Promise<number | null> {
  return new Promise((resolve) => {
    let selected = 0;

    const render = () => renderMenu(title, subtitle, options, selected);
    render();

    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function onData(key: string): void {
      if (isCtrlC(key)) {
        cleanup();
        resolve(null);
        return;
      }

      if (key === ARROW_UP) {
        selected = (selected - 1 + options.length) % options.length;
        render();
        return;
      }

      if (key === ARROW_DOWN) {
        selected = (selected + 1) % options.length;
        render();
        return;
      }

      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(selected);
        return;
      }

      // Number key shortcut
      const num = parseInt(key, 10);
      if (num >= 1 && num <= options.length) {
        cleanup();
        resolve(num - 1);
        return;
      }
    }

    function cleanup(): void {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('data', onData);
  });
}

export async function selectLanguage(): Promise<Language | null> {
  const options: Option[] = [
    { label: 'English', description: '영어' },
    { label: '한국어', description: 'Korean' },
  ];
  const i = await selectOption('  TYPRAC — 타자 연습  ', '언어 선택:', options);
  if (i === null) return null;
  return i === 0 ? 'en' : 'ko';
}

export async function selectMode(lang: Language): Promise<Mode | null> {
  const jamoLabel = lang === 'ko' ? '자모음 모드' : '알파벳 모드';
  const jamoDesc = lang === 'ko' ? '낱자(자음·모음) 연습' : '낱자(알파벳·숫자) 연습';
  const options: Option[] = [
    { label: '일반 모드', description: '단어·문장 연습' },
    { label: jamoLabel, description: jamoDesc },
  ];
  const i = await selectOption('  TYPRAC — 모드 선택  ', '모드 선택:', options);
  if (i === null) return null;
  return i === 0 ? 'normal' : 'jamo';
}

export async function selectDifficulty(mode: Mode = 'normal'): Promise<Difficulty | null> {
  const isJamo = mode === 'jamo';
  const options: Option[] = [
    {
      label: '쉬움',
      description: isJamo ? '기본 자음 / 소문자' : '짧고 간단한 문장',
    },
    {
      label: '보통',
      description: isJamo ? '자음+모음 / 대소문자' : '구두점 포함 일반 문장',
    },
    {
      label: '어려움',
      description: isJamo ? '쌍자음+복합모음 / 대소문자+숫자' : '기호·숫자 포함 복잡한 문장',
    },
  ];
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  const i = await selectOption('  TYPRAC — 난이도 선택  ', '난이도 선택:', options);
  if (i === null) return null;
  return difficulties[i];
}
