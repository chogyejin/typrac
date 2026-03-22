import { selectLanguage, selectMode, selectDifficulty } from './ui/menu.js';
import { renderResult } from './ui/result.js';
import { runSession } from './engine/session.js';
import { getText } from './data/index.js';
import { getJamoText } from './data/jamo.js';
import { showCursor, clearScreen, writeLine } from './ui/renderer.js';
import type { Language, Difficulty, Mode, SessionState } from './types.js';

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

export async function run(): Promise<void> {
  setupCleanup();

  let language: Language | null = null;
  let mode: Mode | null = null;
  let difficulty: Difficulty | null = null;
  let targetText: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Language selection
    if (language === null) {
      language = await selectLanguage();
      if (language === null) break;
    }

    // Mode selection
    if (mode === null) {
      mode = await selectMode(language);
      if (mode === null) {
        language = null;
        continue;
      }
    }

    // Difficulty selection
    if (difficulty === null) {
      difficulty = await selectDifficulty(mode);
      if (difficulty === null) {
        mode = null;
        continue;
      }
    }

    // Get text (reuse on retry)
    if (targetText === null) {
      targetText = mode === 'jamo'
        ? getJamoText(language, difficulty)
        : getText(language, difficulty);
    }

    const initialState: SessionState = {
      targetText,
      typedChars: [],
      currentIndex: 0,
      errorPositions: new Set(),
      totalErrors: 0,
      startTime: null,
      language,
      difficulty,
    };

    const result = await runSession(initialState);

    // null = quit, 'restart' = Ctrl+R during typing
    if (result === null) break;
    if (result === 'restart') {
      targetText = null; // 재시작 시 새 텍스트
      continue;
    }

    // Show result screen
    const action = await renderResult(result);

    if (action === 'retry') {
      continue;
    } else if (action === 'menu') {
      language = null;
      mode = null;
      difficulty = null;
      targetText = null;
      continue;
    } else {
      break;
    }
  }

  clearScreen();
  writeLine('  수고하셨습니다! 다음에 또 연습해요. 👋');
  writeLine();
  showCursor();
}
