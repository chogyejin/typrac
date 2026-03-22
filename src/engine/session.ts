import type { SessionState, SessionResult } from '../types';
import {
  clearScreen,
  writeLine,
  bold,
  cyan,
  dim,
  yellow,
  renderDivider,
  renderTypingLine,
} from '../ui/renderer';
import { calcSpeed, calcAccuracy, countCorrect } from './stats';
import {
  isCtrlC,
  isEsc,
  isBackspace,
  isPrintable,
  isCtrlR,
  isEnter,
} from './input';

function formatTime(ms: number): string {
  const totalTenths = Math.floor(ms / 100);
  const m = Math.floor(totalTenths / 600);
  const s = Math.floor((totalTenths % 600) / 10);
  const t = totalTenths % 10;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}.${t}s`;
  return `${s}.${t}s`;
}

function renderScreen(state: SessionState, completed: boolean): void {
  clearScreen();

  const elapsed = state.startTime ? Date.now() - state.startTime : 0;
  const speed = calcSpeed(state.typedChars, elapsed, state.language);
  const correct = countCorrect(state.typedChars, state.targetText);
  const accuracy = calcAccuracy(correct, state.currentIndex);
  const totalChars = [...state.targetText].length;
  const progress = Math.round((state.currentIndex / totalChars) * 100);
  const sentenceLabel = state.sentenceTotal > 1 ? `  ${state.sentenceNum}/${state.sentenceTotal}` : '';

  writeLine(bold(cyan('  TYPRAC')) + (sentenceLabel ? dim(sentenceLabel) : ''));
  renderDivider();
  writeLine(
    `  ${bold('타수:')} ${yellow(String(speed).padEnd(6))}` +
    `${bold('정확도:')} ${yellow(accuracy.toFixed(1) + '%').padEnd(10)}` +
    `${bold('시간:')} ${yellow(formatTime(elapsed)).padEnd(8)}` +
    `${bold('진행:')} ${yellow(progress + '%')}`,
  );
  renderDivider();
  writeLine();
  writeLine('  ' + bold('목표:'));
  process.stdout.write('  ');
  renderTypingLine(state.targetText, state.typedChars, state.currentIndex);
  writeLine();

  if (state.nextText !== null) {
    writeLine();
    writeLine('  ' + dim('다음:'));
    writeLine('  ' + dim(state.nextText));
  }

  writeLine();
  if (completed) {
    const hint = state.nextText !== null ? '[Enter] 다음 문장' : '[Enter] 결과 보기';
    writeLine('  ' + dim(`${hint}   [Esc] 메인 메뉴`));
  } else {
    writeLine('  ' + dim('[Ctrl+C] 종료   [Ctrl+R] 재시작   [Esc] 메인 메뉴'));
  }
}

export function runSession(
  initialState: SessionState,
): Promise<SessionResult | 'restart' | 'menu' | null> {
  return new Promise((resolve) => {
    const state: SessionState = {
      ...initialState,
      typedChars: [],
      currentIndex: 0,
      startTime: null,
      totalErrors: 0,
      errorPositions: new Set(),
    };
    const targetChars = [...state.targetText];
    let completed = false;

    renderScreen(state, false);

    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function cleanup(): void {
      process.stdin.removeAllListeners('data');
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    function buildResult(): SessionResult {
      const elapsed = state.startTime ? Date.now() - state.startTime : 0;
      const correct = countCorrect(state.typedChars, state.targetText);
      return {
        language: state.language,
        difficulty: state.difficulty,
        wpm: calcSpeed(state.typedChars, elapsed, state.language),
        accuracy: calcAccuracy(correct, state.currentIndex),
        elapsedMs: elapsed,
        totalErrors: state.totalErrors,
        totalChars: state.currentIndex,
      };
    }

    process.stdin.on('data', (key: string) => {
      if (isCtrlC(key)) { cleanup(); resolve(null); return; }
      if (isEsc(key)) { cleanup(); resolve('menu'); return; }
      if (isCtrlR(key)) { cleanup(); resolve('restart'); return; }

      // Completed: wait for Enter
      if (completed) {
        if (isEnter(key)) { cleanup(); resolve(buildResult()); }
        return;
      }

      if (isBackspace(key)) {
        if (state.currentIndex > 0) {
          state.currentIndex--;
          state.typedChars.pop();
          if (state.mode === 'jamo') {
            while (state.currentIndex > 0 && targetChars[state.currentIndex - 1] === ' ') {
              state.currentIndex--;
              state.typedChars.pop();
            }
          }
        }
        renderScreen(state, false);
        return;
      }

      const incoming = [...key].filter(isPrintable);
      if (incoming.length === 0) return;

      if (state.startTime === null) state.startTime = Date.now();

      for (const ch of incoming) {
        if (state.currentIndex >= targetChars.length) break;
        const expected = targetChars[state.currentIndex];
        state.typedChars.push(ch);
        if (ch !== expected) {
          state.errorPositions.add(state.currentIndex);
          state.totalErrors++;
        }
        state.currentIndex++;

        if (state.mode === 'jamo') {
          while (state.currentIndex < targetChars.length && targetChars[state.currentIndex] === ' ') {
            state.typedChars.push(' ');
            state.currentIndex++;
          }
        }
      }

      if (state.currentIndex >= targetChars.length) {
        completed = true;
        renderScreen(state, true);
        return;
      }

      renderScreen(state, false);
    });
  });
}
