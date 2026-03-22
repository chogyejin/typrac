import type { SessionState, SessionResult } from '../types.js';
import {
  clearScreen,
  writeLine,
  bold,
  cyan,
  dim,
  yellow,
  green,
  renderDivider,
  renderTypingLine,
} from '../ui/renderer.js';
import { calcSpeed, calcAccuracy, countCorrect } from './stats.js';
import {
  isCtrlC,
  isEsc,
  isBackspace,
  isPrintable,
  isCtrlR,
} from './input.js';

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (m > 0) return `${m}m ${ss}s`;
  return `${s}s`;
}

function renderScreen(state: SessionState): void {
  clearScreen();

  const elapsed = state.startTime ? Date.now() - state.startTime : 0;
  const speed = calcSpeed(state.currentIndex, elapsed, state.language);
  const correct = countCorrect(state.typedChars, state.targetText);
  const accuracy = calcAccuracy(correct, state.currentIndex);
  const speedLabel = state.language === 'ko' ? 'KPM' : 'WPM';
  const totalChars = [...state.targetText].length;
  const progress = Math.round((state.currentIndex / totalChars) * 100);

  writeLine(bold(cyan('  TYPRAC')));
  renderDivider();
  writeLine(
    `  ${bold(speedLabel + ':')} ${yellow(String(speed).padEnd(6))}` +
    `${bold('Accuracy:')} ${yellow(accuracy.toFixed(1) + '%').padEnd(10)}` +
    `${bold('Time:')} ${yellow(formatTime(elapsed)).padEnd(8)}` +
    `${bold('Progress:')} ${yellow(progress + '%')}`,
  );
  renderDivider();
  writeLine();
  writeLine('  ' + bold('Target:'));
  process.stdout.write('  ');
  renderTypingLine(state.targetText, state.typedChars, state.currentIndex);
  writeLine();
  writeLine();
  writeLine('  ' + dim('[Esc/Ctrl+C] Quit   [Ctrl+R] Restart'));
}

export function runSession(
  initialState: SessionState,
): Promise<SessionResult | 'restart' | null> {
  return new Promise((resolve) => {
    const state: SessionState = { ...initialState, typedChars: [], currentIndex: 0, startTime: null, totalErrors: 0, errorPositions: new Set() };
    const targetChars = [...state.targetText];

    renderScreen(state);

    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    function cleanup(): void {
      process.stdin.removeAllListeners('data');
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    function finish(): void {
      cleanup();
      const elapsed = state.startTime ? Date.now() - state.startTime : 0;
      const correct = countCorrect(state.typedChars, state.targetText);
      const accuracy = calcAccuracy(correct, state.currentIndex);
      const speed = calcSpeed(state.currentIndex, elapsed, state.language);
      resolve({
        language: state.language,
        difficulty: state.difficulty,
        wpm: speed,
        accuracy,
        elapsedSeconds: Math.round(elapsed / 1000),
        totalErrors: state.totalErrors,
        totalChars: state.currentIndex,
      });
    }

    process.stdin.on('data', (key: string) => {
      if (isCtrlC(key)) {
        cleanup();
        resolve(null);
        return;
      }

      if (isEsc(key)) {
        cleanup();
        resolve(null);
        return;
      }

      if (isCtrlR(key)) {
        cleanup();
        resolve('restart');
        return;
      }

      if (isBackspace(key)) {
        if (state.currentIndex > 0) {
          state.currentIndex--;
          state.typedChars.pop();
        }
        renderScreen(state);
        return;
      }

      if (!isPrintable(key)) return;

      // Start timer on first keypress
      if (state.startTime === null) {
        state.startTime = Date.now();
      }

      const expected = targetChars[state.currentIndex];
      const ch = [...key][0]; // take first char only (safety)
      if (!ch) return;

      state.typedChars.push(ch);
      if (ch !== expected) {
        state.errorPositions.add(state.currentIndex);
        state.totalErrors++;
      }
      state.currentIndex++;

      // Completed
      if (state.currentIndex >= targetChars.length) {
        renderScreen(state);
        finish();
        return;
      }

      renderScreen(state);
    });
  });
}
