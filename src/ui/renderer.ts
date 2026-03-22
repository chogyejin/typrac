import chalk from 'chalk';

export function clearScreen(): void {
  process.stdout.write('\x1B[2J\x1B[H');
}

export function moveTo(row: number, col: number): void {
  process.stdout.write(`\x1B[${row};${col}H`);
}

export function hideCursor(): void {
  process.stdout.write('\x1B[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1B[?25h');
}

export function write(text: string): void {
  process.stdout.write(text);
}

export function writeLine(text: string = ''): void {
  process.stdout.write(text + '\n');
}

export function dim(text: string): string {
  return chalk.dim(text);
}

export function bold(text: string): string {
  return chalk.bold(text);
}

export function green(text: string): string {
  return chalk.green(text);
}

export function red(text: string): string {
  return chalk.bgRed.white(text);
}

export function yellow(text: string): string {
  return chalk.yellow(text);
}

export function cyan(text: string): string {
  return chalk.cyan(text);
}

export function white(text: string): string {
  return chalk.white(text);
}

function displayWidth(str: string): number {
  let width = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0)!;
    const isWide =
      (cp >= 0x1100 && cp <= 0x11FF) ||  // Hangul Jamo
      (cp >= 0x2E80 && cp <= 0x303F) ||  // CJK Radicals / Kangxi
      (cp >= 0x3040 && cp <= 0x33FF) ||  // Kana, Hangul Compat Jamo, CJK Compat
      (cp >= 0x3400 && cp <= 0x4DBF) ||  // CJK Extension A
      (cp >= 0x4E00 && cp <= 0x9FFF) ||  // CJK Unified Ideographs
      (cp >= 0xAC00 && cp <= 0xD7AF) ||  // Hangul Syllables
      (cp >= 0xF900 && cp <= 0xFAFF) ||  // CJK Compat Ideographs
      (cp >= 0xFF01 && cp <= 0xFF60) ||  // Fullwidth Forms
      (cp >= 0xFFE0 && cp <= 0xFFE6);    // Fullwidth Signs
    width += isWide ? 2 : 1;
  }
  return width;
}

export function renderHeader(title: string): void {
  const BOX = 50;
  const line = '─'.repeat(BOX);
  writeLine(bold(cyan('┌' + line + '┐')));
  const titleWidth = displayWidth(title);
  const padding = Math.floor((BOX - titleWidth) / 2);
  const rightPad = BOX - padding - titleWidth;
  const paddedTitle = ' '.repeat(padding) + title + ' '.repeat(rightPad);
  writeLine(bold(cyan('│')) + bold(white(paddedTitle)) + bold(cyan('│')));
  writeLine(bold(cyan('└' + line + '┘')));
}

export function renderDivider(): void {
  writeLine(dim('─'.repeat(52)));
}

export function renderTypingLine(
  targetText: string,
  typedChars: string[],
  currentIndex: number,
): void {
  const chars = [...targetText];
  let output = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (i < currentIndex) {
      const typed = typedChars[i];
      if (typed === ch) {
        output += green(ch);
      } else {
        output += red(typed ?? ch);
      }
    } else if (i === currentIndex) {
      output += chalk.bgWhite.black(ch);
    } else {
      output += dim(ch);
    }
  }

  write(output);
}
