import type { SessionState, SessionResult } from "../types";
import {
  clearScreen,
  clearToEnd,
  writeLine,
  bold,
  cyan,
  dim,
  yellow,
  renderDivider,
  renderTypingLine,
  hideCursor,
  showCursor,
  formatCountdown,
} from "../ui/renderer";
import { calcSpeed, calcAccuracy, countCorrect } from "./stats";
import { isCtrlC, isEsc, isBackspace, isPrintable, isEnter } from "./input";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m > 0) return `${m}분 ${s.toString().padStart(2, "0")}초`;
  return `${s}초`;
}

function renderScreen(
  state: SessionState,
  completed: boolean,
  exitPending = false,
): void {
  clearScreen();

  const typingElapsed = state.startTime ? Date.now() - state.startTime : 0;
  const speed = calcSpeed(state.typedChars, typingElapsed, state.language);
  const correct = countCorrect(state.typedChars, state.targetText);
  const accuracy = calcAccuracy(correct, state.currentIndex);
  const totalChars = [...state.targetText].length;
  const progress = Math.round((state.currentIndex / totalChars) * 100);
  const sentenceLabel =
    state.sentenceTotal > 1
      ? `  ${state.sentenceNum}/${state.sentenceTotal}`
      : "";

  writeLine(bold(cyan("  TYPRAC")) + (sentenceLabel ? dim(sentenceLabel) : ""));
  renderDivider();
  writeLine(`  ${bold("타수:")}    ${yellow(String(speed))}`);
  writeLine(`  ${bold("정확도:")}  ${yellow(accuracy.toFixed(1) + "%")}`);
  writeLine(`  ${bold("시간:")}    ${yellow(formatTime(typingElapsed))}`);
  writeLine(`  ${bold("진행:")}    ${yellow(progress + "%")}`);
  renderDivider();
  writeLine();
  writeLine("  " + bold("목표:"));
  process.stdout.write("\x1b#6  ");
  renderTypingLine(state.targetText, state.typedChars, state.currentIndex);
  process.stdout.write("\x1B[K\n");
  writeLine();

  if (state.nextText !== null) {
    writeLine();
    writeLine("  " + dim("다음:"));
    writeLine("  " + dim(state.nextText));
  }

  writeLine();
  if (exitPending) {
    writeLine("  " + yellow("한 번 더 누르면 종료됩니다."));
  } else if (completed) {
    const hint =
      state.nextText !== null ? "[Enter] 다음 문장" : "[Enter] 결과 보기";
    writeLine("  " + dim(`${hint}   [Esc] 메인 메뉴`));
  } else {
    writeLine("  " + dim("[Ctrl+C] 종료   [Esc] 메인 메뉴"));
  }
  if (state.countdown !== null) {
    writeLine(
      "  " + dim("남은 시간: ") + yellow(formatCountdown(state.countdown)),
    );
  }
  clearToEnd();
}

export function runSession(
  initialState: SessionState,
): Promise<SessionResult | "menu" | null> {
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
    let completedAt: number | null = null;
    let exitPending = false;
    let exitTimer: ReturnType<typeof setTimeout> | null = null;

    hideCursor();
    renderScreen(state, false);

    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    const ticker = setInterval(() => {
      if (!completed) renderScreen(state, false, exitPending);
    }, 1000);

    function cleanup(): void {
      clearInterval(ticker);
      if (exitTimer) clearTimeout(exitTimer);
      showCursor();
      process.stdin.removeAllListeners("data");
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    function buildResult(): SessionResult {
      const elapsed =
        (completedAt ?? Date.now()) - (state.startTime ?? Date.now());
      const correct = countCorrect(state.typedChars, state.targetText);
      return {
        language: state.language,
        difficulty: state.difficulty,
        wpm: calcSpeed(state.typedChars, elapsed, state.language),
        accuracy: calcAccuracy(correct, state.currentIndex),
        elapsedMs: elapsed,
        totalErrors: state.currentIndex - correct,
        totalChars: state.currentIndex,
      };
    }

    process.stdin.on("data", (key: string) => {
      if (isCtrlC(key)) {
        if (exitPending) {
          cleanup();
          resolve(null);
          return;
        }
        exitPending = true;
        renderScreen(state, completed, true);
        exitTimer = setTimeout(() => {
          exitPending = false;
          exitTimer = null;
          renderScreen(state, completed, false);
        }, 2000);
        return;
      }
      if (isEsc(key)) {
        cleanup();
        resolve("menu");
        return;
      }

      // Completed: wait for Enter
      if (completed) {
        if (isEnter(key)) {
          cleanup();
          resolve(buildResult());
        }
        return;
      }

      if (isBackspace(key)) {
        if (state.currentIndex > 0) {
          if (state.mode === "jamo") {
            // 후미 자동 공백 제거
            while (
              state.typedChars.length > 0 &&
              state.typedChars[state.typedChars.length - 1] === " "
            ) {
              state.typedChars.pop();
              state.currentIndex--;
            }
            // 실제 글자 제거
            if (state.currentIndex > 0) {
              state.typedChars.pop();
              state.currentIndex--;
            }
          } else {
            state.currentIndex--;
            state.typedChars.pop();
          }
        }
        renderScreen(state, false);
        return;
      }

      if (key.startsWith("\x1b")) return;

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

        if (state.mode === "jamo") {
          while (
            state.currentIndex < targetChars.length &&
            targetChars[state.currentIndex] === " "
          ) {
            state.typedChars.push(" ");
            state.currentIndex++;
          }
        }
      }

      if (state.currentIndex >= targetChars.length) {
        completed = true;
        completedAt = Date.now();
        renderScreen(state, true);
        return;
      }

      renderScreen(state, false);
    });
  });
}
