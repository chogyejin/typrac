import type { SessionResult } from '../types';
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
} from './renderer';
import { isCtrlC, isEsc } from '../engine/input';

function formatTime(ms: number): string {
  const totalTenths = Math.floor(ms / 100);
  const m = Math.floor(totalTenths / 600);
  const s = Math.floor((totalTenths % 600) / 10);
  const t = totalTenths % 10;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}.${t}s`;
  return `${s}.${t}s`;
}

export function renderBetweenSentences(current: number, total: number): Promise<'continue' | 'menu' | null> {
  clearScreen();
  renderHeader(`  TYPRAC — ${current}/${total} 완료  `);
  writeLine();
  writeLine('  ' + green(`✓ ${current}번째 문장 완료!`));
  writeLine();
  writeLine('  ' + bold('다음 문장으로 넘어갈까요?'));
  writeLine();
  renderDivider();
  writeLine();
  writeLine('  ' + yellow('[Enter/Space]') + '  다음 문장');
  writeLine('  ' + cyan('[M]') + '           메인 메뉴');

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function onData(key: string): void {
      const k = key.toLowerCase();
      if (k === '\r' || k === '\n' || k === ' ') {
        cleanup();
        resolve('continue');
      } else if (k === 'm') {
        cleanup();
        resolve('menu');
      } else if (isCtrlC(key)) {
        cleanup();
        resolve(null);
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

export function renderResult(result: SessionResult): Promise<'retry' | 'menu' | 'quit'> {
  clearScreen();
  renderHeader('  TYPRAC — 결과  ');
  writeLine();

  const speedLabel = '타수';

  writeLine('  ' + bold(speedLabel + ':   ') + yellow(String(result.wpm)));
  writeLine('  ' + bold('정확도:    ') + yellow(result.accuracy.toFixed(1) + '%'));
  writeLine('  ' + bold('시간:      ') + yellow(formatTime(result.elapsedMs)));
  writeLine('  ' + bold('오류:      ') + yellow(String(result.totalErrors)));
  writeLine('  ' + bold('입력 글자: ') + yellow(String(result.totalChars)));
  writeLine();
  renderDivider();
  writeLine();
  writeLine('  ' + green('[R]') + '  같은 문장 다시 하기');
  writeLine('  ' + cyan('[M]') + '  메인 메뉴');
  writeLine('  ' + dim('[Q/Ctrl+C]') + '  종료');

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
      } else if (k === 'q' || isCtrlC(key)) {
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
