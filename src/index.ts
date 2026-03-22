import { selectLanguage, selectMode, selectDifficulty } from './ui/menu';
import { renderResult } from './ui/result';
import { runSession } from './engine/session';
import { getText } from './data/index';
import { getJamoText } from './data/jamo';
import { showCursor, clearScreen, writeLine } from './ui/renderer';
import type { Language, Difficulty, Mode, SessionState } from './types';

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

export async function run(): Promise<void> {
  setupCleanup();

  let language: Language | null = null;
  let mode: Mode | null = null;
  let difficulty: Difficulty | null = null;
  let targetText: string | null = null;

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

    if (targetText === null) {
      targetText = mode === 'jamo'
        ? getJamoText(language, difficulty)
        : getText(language, difficulty);
    }

    const result = await runSession(makeState(targetText, language, difficulty, mode));

    if (result === null) break;
    if (result === 'restart') { targetText = null; continue; }
    if (result === 'menu') { language = null; mode = null; difficulty = null; targetText = null; continue; }

    const action = await renderResult(result);
    if (action === 'retry') continue;
    if (action === 'menu') { language = null; mode = null; difficulty = null; targetText = null; continue; }
    break;
  }

  clearScreen();
  writeLine('  수고하셨습니다! 다음에 또 연습해요. 👋');
  writeLine();
  showCursor();
}
