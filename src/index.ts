import {
  selectMainMenu,
  selectLanguage,
  selectMode,
  selectDifficulty,
} from "./ui/menu";
import { renderResult } from "./ui/result";
import { runSession } from "./engine/session";
import { getText } from "./data/index";
import { getJamoText } from "./data/jamo";
import { loadRecords, saveRecord } from "./data/records";
import { showHistory } from "./ui/history";
import { showCursor, clearScreen, writeLine } from "./ui/renderer";
import type {
  Language,
  Difficulty,
  Mode,
  SessionState,
  SessionResult,
  Countdown,
} from "./types";

const SENTENCE_COUNT = 3;

function setupCleanup(): void {
  const cleanup = (): void => {
    showCursor();
    process.stdout.write("\x1B[?25h");
    process.stdout.write("\n");
    process.exit(0);
  };
  process.on("exit", () => showCursor());
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

function makeState(
  texts: string[],
  index: number,
  language: Language,
  difficulty: Difficulty,
  mode: Mode,
  countdown: Countdown | null,
): SessionState {
  return {
    targetText: texts[index],
    nextText: index + 1 < texts.length ? texts[index + 1] : null,
    sentenceNum: index + 1,
    sentenceTotal: texts.length,
    typedChars: [],
    currentIndex: 0,
    startTime: null,
    language,
    difficulty,
    mode,
    countdown,
  };
}

function mergeResults(results: SessionResult[]): SessionResult {
  return {
    language: results[0].language,
    difficulty: results[0].difficulty,
    wpm: Math.round(results.reduce((s, r) => s + r.wpm, 0) / results.length),
    accuracy:
      Math.round(
        (results.reduce((s, r) => s + r.accuracy, 0) / results.length) * 10,
      ) / 10,
    elapsedMs: results.reduce((s, r) => s + r.elapsedMs, 0),
    totalErrors: results.reduce((s, r) => s + r.totalErrors, 0),
    totalChars: results.reduce((s, r) => s + r.totalChars, 0),
  };
}

function generateTexts(
  count: number,
  lang: Language,
  diff: Difficulty,
  mode: Mode,
): string[] {
  return Array.from({ length: count }, () =>
    mode === "jamo" ? getJamoText(lang, diff) : getText(lang, diff),
  );
}

function parseTimeLimit(): number | null {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === "--time" || a === "-t");
  if (idx === -1) return null;
  const val = parseInt(args[idx + 1], 10);
  if (!isFinite(val) || val <= 0 || String(val) !== args[idx + 1]) {
    console.error(`오류: --time 값은 양의 정수여야 합니다. (예: --time 5)`);
    process.exit(1);
  }
  return val;
}

export async function run(): Promise<void> {
  setupCleanup();

  const args = process.argv.slice(2);
  if (args[0] === "records" || args[0] === "r") {
    const records = loadRecords();
    await showHistory(records);
    showCursor();
    return;
  }

  const cliStart = Date.now();
  const timeLimitMin = parseTimeLimit();
  const countdown: Countdown | null =
    timeLimitMin !== null
      ? { start: cliStart, limitMs: timeLimitMin * 60 * 1000 }
      : null;

  if (countdown !== null) {
    setTimeout(() => {
      clearScreen();
      writeLine(
        `  ${timeLimitMin}분 제한 시간이 종료되었습니다. 수고하셨습니다! 👋`,
      );
      writeLine();
      showCursor();
      process.exit(0);
    }, countdown.limitMs).unref();
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // 메인 메뉴
    const mainMenu = await selectMainMenu(countdown ?? undefined);
    if (mainMenu === null) continue;

    if (mainMenu === "history") {
      const records = loadRecords();
      await showHistory(records, countdown ?? undefined);
      continue;
    }

    // 게임 시작
    let language: Language | null = null;
    let mode: Mode | null = null;
    let difficulty: Difficulty | null = null;
    let backToMain = false;

    while (!backToMain) {
      if (language === null) {
        language = await selectLanguage(countdown ?? undefined);
        if (language === null) {
          backToMain = true;
          break;
        }
      }
      if (mode === null) {
        mode = await selectMode(language, countdown ?? undefined);
        if (mode === null) {
          language = null;
          continue;
        }
      }
      if (difficulty === null) {
        difficulty = await selectDifficulty(mode, countdown ?? undefined);
        if (difficulty === null) {
          mode = null;
          continue;
        }
      }

      const count = mode === "jamo" ? 1 : SENTENCE_COUNT;
      const texts = generateTexts(count, language, difficulty, mode);
      const results: SessionResult[] = [];
      let goMenu = false;
      let quit = false;

      for (let i = 0; i < count; i++) {
        const result = await runSession(
          makeState(texts, i, language, difficulty, mode, countdown),
        );

        if (result === null) {
          quit = true;
          break;
        }
        if (result === "menu") {
          goMenu = true;
          break;
        }

        results.push(result);
      }

      if (quit) {
        clearScreen();
        writeLine("  수고하셨습니다! 다음에 또 연습해요. 👋");
        writeLine();
        showCursor();
        return;
      }
      if (goMenu) {
        backToMain = true;
        break;
      }
      if (results.length === 0) continue;

      const merged = mergeResults(results);

      const onSave =
        mode === "normal"
          ? () => {
              saveRecord({
                date: new Date().toISOString(),
                language: merged.language,
                difficulty: merged.difficulty,
                wpm: merged.wpm,
                accuracy: merged.accuracy,
                elapsedMs: merged.elapsedMs,
                totalErrors: merged.totalErrors,
                totalChars: merged.totalChars,
              });
            }
          : null;

      const action = await renderResult(
        merged,
        merged.elapsedMs,
        countdown,
        onSave,
      );
      if (action === "retry") {
        continue;
      }
      if (action === "menu") {
        backToMain = true;
      }
      break;
    }
  }

  clearScreen();
  writeLine("  수고하셨습니다! 다음에 또 연습해요. 👋");
  writeLine();
  showCursor();
}
