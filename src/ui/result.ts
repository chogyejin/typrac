import type { SessionResult } from '../types.js';
import {
  clearScreen,
  writeLine,
  bold,
  cyan,
  yellow,
  green,
  dim,
  renderDivider,
  renderHeader,
} from './renderer.js';
import { isCtrlC, isEsc } from '../engine/input.js';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m > 0
    ? `${m}m ${ss.toString().padStart(2, '0')}s`
    : `${s}s`;
}

export function renderResult(result: SessionResult): Promise<'retry' | 'menu' | 'quit'> {
  clearScreen();
  renderHeader('  TYPRAC — Results  ');
  writeLine();

  const speedLabel = result.language === 'ko' ? 'KPM' : 'WPM';

  writeLine('  ' + bold(speedLabel + ':      ') + yellow(String(result.wpm)));
  writeLine('  ' + bold('Accuracy:  ') + yellow(result.accuracy.toFixed(1) + '%'));
  writeLine('  ' + bold('Time:      ') + yellow(formatTime(result.elapsedSeconds)));
  writeLine('  ' + bold('Errors:    ') + yellow(String(result.totalErrors)));
  writeLine('  ' + bold('Chars:     ') + yellow(String(result.totalChars)));
  writeLine();
  renderDivider();
  writeLine();
  writeLine('  ' + green('[R]') + '  Retry same text');
  writeLine('  ' + cyan('[M]') + '  Main Menu');
  writeLine('  ' + dim('[Q/Esc]') + '  Quit');

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function onData(key: string): void {
      const k = key.toLowerCase();
      if (k === 'r') {
        cleanup();
        resolve('retry');
      } else if (k === 'm') {
        cleanup();
        resolve('menu');
      } else if (k === 'q' || isEsc(key) || isCtrlC(key)) {
        cleanup();
        resolve('quit');
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
