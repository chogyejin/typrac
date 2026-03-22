import { selectLanguage, selectDifficulty } from './ui/menu.js';
import { renderResult } from './ui/result.js';
import { runSession } from './engine/session.js';
import { getText } from './data/index.js';
import { showCursor, clearScreen, writeLine } from './ui/renderer.js';
import type { Language, Difficulty, SessionState } from './types.js';

function setupCleanup(): void {
  const cleanup = (): void => {
    showCursor();
    process.stdout.write('\x1B[?25h'); // ensure cursor visible
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
  let difficulty: Difficulty | null = null;
  let targetText: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Language selection
    if (language === null) {
      language = await selectLanguage();
      if (language === null) break;
    }

    // Difficulty selection
    if (difficulty === null) {
      difficulty = await selectDifficulty();
      if (difficulty === null) {
        language = null; // go back to language selection
        continue;
      }
    }

    // Get text (reuse on retry)
    if (targetText === null) {
      targetText = getText(language, difficulty);
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

    // null = quit/esc, 'restart' = Ctrl+R during typing
    if (result === null) break;
    if (result === 'restart') continue;

    // Show result screen
    const action = await renderResult(result);

    if (action === 'retry') {
      // Keep same text, language, difficulty
      continue;
    } else if (action === 'menu') {
      language = null;
      difficulty = null;
      targetText = null;
      continue;
    } else {
      break;
    }
  }

  clearScreen();
  writeLine('  Bye! Keep practicing. 👋');
  writeLine();
  showCursor();
}
