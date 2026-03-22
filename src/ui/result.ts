import type { SessionResult, Countdown } from "../types";
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
} from "./renderer";
import { isCtrlC } from "../engine/input";
import { formatTime } from "../utils";

function renderResultScreen(
  result: SessionResult,
  elapsedMs: number,
  countdown: Countdown | null,
  exitPending: boolean,
  onSave: (() => void) | null,
  saved: boolean,
): void {
  clearScreen();
  renderHeader("  TYPRAC — 결과  ");
  writeLine();

  writeLine("  " + bold("타수:      ") + yellow(String(result.wpm)));
  writeLine(
    "  " + bold("정확도:    ") + yellow(result.accuracy.toFixed(1) + "%"),
  );
  writeLine("  " + bold("시간:      ") + yellow(formatTime(elapsedMs)));
  writeLine("  " + bold("오류:      ") + yellow(String(result.totalErrors)));
  writeLine("  " + bold("입력 글자: ") + yellow(String(result.totalChars)));
  writeLine();
  renderDivider();
  writeLine();
  writeLine("  " + green("[R]") + "  이 모드 다시하기");
  writeLine("  " + cyan("[M]") + "  메인 메뉴");
  if (onSave !== null) {
    if (saved) {
      writeLine("  " + dim("[S]") + "  " + green("저장됨 ✓"));
    } else {
      writeLine("  " + yellow("[S]") + "  기록 저장");
    }
  }
  if (exitPending) {
    writeLine("  " + yellow("한 번 더 누르면 종료됩니다."));
  }
  if (countdown !== null) {
    writeLine("  " + dim("남은 시간: ") + yellow(formatCountdown(countdown)));
  }
  clearToEnd();
}

export function renderResult(
  result: SessionResult,
  elapsedMs: number,
  countdown: Countdown | null,
  onSave: (() => void) | null = null,
): Promise<"retry" | "menu" | "quit"> {
  let exitPending = false;
  let exitTimer: ReturnType<typeof setTimeout> | null = null;
  let saved = false;

  const render = () =>
    renderResultScreen(
      result,
      elapsedMs,
      countdown,
      exitPending,
      onSave,
      saved,
    );

  render();

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    function onData(key: string): void {
      if (isCtrlC(key)) {
        if (exitPending) {
          cleanup();
          showCursor();
          process.exit(0);
        }
        exitPending = true;
        render();
        exitTimer = setTimeout(() => {
          exitPending = false;
          exitTimer = null;
          render();
        }, 2000);
        return;
      }
      if (exitPending) {
        exitPending = false;
        if (exitTimer) {
          clearTimeout(exitTimer);
          exitTimer = null;
        }
        render();
      }
      const k = key.toLowerCase();
      if (k === "s" && onSave !== null && !saved) {
        onSave();
        saved = true;
        render();
        return;
      }
      if (k === "r") {
        cleanup();
        resolve("retry");
      } else if (k === "m") {
        cleanup();
        resolve("menu");
      }
    }

    function cleanup(): void {
      if (exitTimer) clearTimeout(exitTimer);
      showCursor();
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on("data", onData);
  });
}
