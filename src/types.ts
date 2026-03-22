export type Language = 'en' | 'ko';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'normal' | 'jamo';

export interface SessionState {
  targetText: string;
  nextText: string | null;
  sentenceNum: number;
  sentenceTotal: number;
  typedChars: string[];
  currentIndex: number;
  errorPositions: Set<number>;
  totalErrors: number;
  startTime: number | null;
  language: Language;
  difficulty: Difficulty;
  mode: Mode;
}

export interface SessionResult {
  language: Language;
  difficulty: Difficulty;
  wpm: number;
  accuracy: number;
  elapsedMs: number;
  totalErrors: number;
  totalChars: number;
}
