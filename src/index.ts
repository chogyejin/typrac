import { selectLanguage, selectMode, selectDifficulty } from './ui/menu';
import { renderResult } from './ui/result';
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

function makeState(
  texts: string[],
  index: number,
  language: Language,
  difficulty: Difficulty,
  mode: Mode,
): SessionState {
  return {
    targetText: texts[index],
    nextText: index + 1 < texts.length ? texts[index + 1] : null,
    sentenceNum: index + 1,
    sentenceTotal: texts.length,
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

function mergeResults(results: SessionResult[]): SessionResult {
  return {
    language: results[0].language,
    difficulty: results[0].difficulty,
    wpm: Math.round(results.reduce((s, r) => s + r.wpm, 0) / results.length),
    accuracy: Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length * 10) / 10,
    elapsedMs: results.reduce((s, r) => s + r.elapsedMs, 0),
    totalErrors: results.reduce((s, r) => s + r.totalErrors, 0),
    totalChars: results.reduce((s, r) => s + r.totalChars, 0),
  };
}

function generateTexts(count: number, lang: Language, diff: Difficulty, mode: Mode): string[] {
  return Array.from({ length: count }, () =>
    mode === 'jamo' ? getJamoText(lang, diff) : getText(lang, diff)
  );
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

    const count = mode === 'jamo' ? 1 : SENTENCE_COUNT;
    let texts = generateTexts(count, language, difficulty, mode);
    const results: SessionResult[] = [];
    let goMenu = false;
    let quit = false;

    for (let i = 0; i < count; i++) {
      const result = await runSession(makeState(texts, i, language, difficulty, mode));

      if (result === null) { quit = true; break; }
      if (result === 'menu') { goMenu = true; break; }
      if (result === 'restart') {
        texts = generateTexts(count, language, difficulty, mode);
        results.length = 0;
        i = -1;
        continue;
      }

      results.push(result);
    }

    if (quit) break;
    if (goMenu) { language = null; mode = null; difficulty = null; continue; }
    if (results.length === 0) continue;

    const action = await renderResult(mergeResults(results));
    if (action === 'retry') continue;
    if (action === 'menu') { language = null; mode = null; difficulty = null; continue; }
    break;
  }

  clearScreen();
  writeLine('  수고하셨습니다! 다음에 또 연습해요. 👋');
  writeLine();
  showCursor();
}
