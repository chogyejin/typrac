import { selectLanguage, selectMode, selectDifficulty } from './ui/menu';
import { renderResult, renderBetweenSentences } from './ui/result';
import { runSession } from './engine/session';
import { getText } from './data/index';
import { getJamoText } from './data/jamo';
import { showCursor, clearScreen, writeLine } from './ui/renderer';
import type { Language, Difficulty, Mode, SessionState, SessionResult } from './types';

const SENTENCE_COUNT = 3;

function setupCleanup(): void {
  const cleanup = (): void => {
    showCursor();
    process.stdout.write('\x1B[?25h');
    process.stdout.write('\n');
    process.exit(0);
  };
  process.on('exit', () => showCursor());
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function mergeResults(results: SessionResult[]): SessionResult {
  const totalMs = results.reduce((s, r) => s + r.elapsedMs, 0);
  const totalChars = results.reduce((s, r) => s + r.totalChars, 0);
  const totalErrors = results.reduce((s, r) => s + r.totalErrors, 0);
  const avgWpm = Math.round(results.reduce((s, r) => s + r.wpm, 0) / results.length);
  const avgAccuracy = Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length * 10) / 10;
  return {
    language: results[0].language,
    difficulty: results[0].difficulty,
    wpm: avgWpm,
    accuracy: avgAccuracy,
    elapsedMs: totalMs,
    totalErrors,
    totalChars,
  };
}

export async function run(): Promise<void> {
  setupCleanup();

  let language: Language | null = null;
  let mode: Mode | null = null;
  let difficulty: Difficulty | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (language === null) {
      language = await selectLanguage();
      if (language === null) break;
    }

    if (mode === null) {
      mode = await selectMode(language);
      if (mode === null) { language = null; continue; }
    }

    if (difficulty === null) {
      difficulty = await selectDifficulty(mode);
      if (difficulty === null) { mode = null; continue; }
    }

    if (mode === 'jamo') {
      // 자모음 모드: 단일 세션
      const targetText = getJamoText(language, difficulty);
      const result = await runSession(makeState(targetText, language, difficulty, mode));

      if (result === null) break;
      if (result === 'restart') continue;
      if (result === 'menu') { language = null; mode = null; difficulty = null; continue; }

      const action = await renderResult(result);
      if (action === 'retry') continue;
      if (action === 'menu') { language = null; mode = null; difficulty = null; continue; }
      break;
    } else {
      // 일반 모드: 3문장 순서대로
      const texts = Array.from({ length: SENTENCE_COUNT }, () => getText(language!, difficulty!));
      const results: SessionResult[] = [];
      let aborted: 'menu' | null = null;

      for (let i = 0; i < SENTENCE_COUNT; i++) {
        const result = await runSession(makeState(texts[i], language, difficulty, mode));

        if (result === null) { aborted = null; break; }
        if (result === 'restart') { results.length = 0; i = -1; continue; } // 처음부터
        if (result === 'menu') { aborted = 'menu'; break; }

        results.push(result);

        if (i < SENTENCE_COUNT - 1) {
          const between = await renderBetweenSentences(i + 1, SENTENCE_COUNT);
          if (between === null) { aborted = null; break; }
          if (between === 'menu') { aborted = 'menu'; break; }
        }
      }

      if (aborted === null && results.length === 0) break; // Ctrl+C
      if (aborted === 'menu' || results.length === 0) {
        language = null; mode = null; difficulty = null; continue;
      }

      const action = await renderResult(mergeResults(results));
      if (action === 'retry') continue;
      if (action === 'menu') { language = null; mode = null; difficulty = null; continue; }
      break;
    }
  }

  clearScreen();
  writeLine('  수고하셨습니다! 다음에 또 연습해요. 👋');
  writeLine();
  showCursor();
}

function makeState(
  targetText: string,
  language: Language,
  difficulty: Difficulty,
  mode: Mode,
): SessionState {
  return {
    targetText,
    typedChars: [],
    currentIndex: 0,
    errorPositions: new Set(),
    totalErrors: 0,
    startTime: null,
    language,
    difficulty,
    mode,
  };
}
