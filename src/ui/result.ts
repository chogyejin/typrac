import type { SessionResult, Countdown } from '../types';
import {
  clearScreen,
  clearToEnd,
  writeLine,
  bold,
  cyan,
  yellow,
  green,
  dim,
  renderDivider,
  renderHeader,
  showCursor,
  formatCountdown,
} from './renderer';
import { isCtrlC } from '../engine/input';

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m > 0) return `${m}분 ${s.toString().padStart(2, '0')}초`;
  return `${s}초`;
}

function renderResultScreen(result: SessionResult, elapsedMs: number, countdown: Countdown | null, exitPending: boolean): void {
  clearScreen();
  renderHeader('  TYPRAC — 결과  ');
  writeLine();

  writeLine('  ' + bold('타수:      ') + yellow(String(result.wpm)));
  writeLine('  ' + bold('정확도:    ') + yellow(result.accuracy.toFixed(1) + '%'));
  writeLine('  ' + bold('시간:      ') + yellow(formatTime(elapsedMs)));
  writeLine('  ' + bold('오류:      ') + yellow(String(result.totalErrors)));
  writeLine('  ' + bold('입력 글자: ') + yellow(String(result.totalChars)));
  writeLine();
  renderDivider();
  writeLine();
  writeLine('  ' + green('[R]') + '  같은 문장 다시 하기');
  writeLine('  ' + cyan('[M]') + '  메인 메뉴');
  if (exitPending) {
    writeLine('  ' + yellow('한 번 더 누르면 종료됩니다.'));
  }
  if (countdown !== null) {
    writeLine('  ' + dim('남은 시간: ') + yellow(formatCountdown(countdown)));
  }
  clearToEnd();
}

export function renderResult(result: SessionResult, elapsedMs: number, countdown: Countdown | null): Promise<'retry' | 'menu' | 'quit'> {
  let exitPending = false;
  let exitTimer: ReturnType<typeof setTimeout> | null = null;

  renderResultScreen(result, elapsedMs, countdown, false);

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function onData(key: string): void {
      if (isCtrlC(key)) {
        if (exitPending) { cleanup(); showCursor(); process.exit(0); }
        exitPending = true;
        renderResultScreen(result, elapsedMs, countdown, true);
        exitTimer = setTimeout(() => {
          exitPending = false;
          exitTimer = null;
          renderResultScreen(result, elapsedMs, countdown, false);
        }, 2000);
        return;
      }
      if (exitPending) { exitPending = false; if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; } renderResultScreen(result, elapsedMs, countdown, false); }
      const k = key.toLowerCase();
      if (k === 'r') { cleanup(); resolve('retry'); }
      else if (k === 'm') { cleanup(); resolve('menu'); }
    }

    function cleanup(): void {
      if (exitTimer) clearTimeout(exitTimer);
      showCursor();
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('data', onData);
  });
}
