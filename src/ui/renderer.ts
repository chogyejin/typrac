import chalk from "chalk";
import type { Countdown } from "../types";

export function formatCountdown(cd: Countdown): string {
  const remaining = Math.max(0, cd.limitMs - (Date.now() - cd.start));
  const totalSec = Math.ceil(remaining / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}분 ${s}초 남음` : `${s}초 남음`;
}

export function clearScreen(): void {
  process.stdout.write("\x1B[H");
}

export function clearToEnd(): void {
  process.stdout.write("\x1B[J");
}

export function moveTo(row: number, col: number): void {
  process.stdout.write(`\x1B[${row};${col}H`);
}

export function hideCursor(): void {
  process.stdout.write("\x1B[?25l");
}

export function showCursor(): void {
  process.stdout.write("\x1B[?25h");
}

export function write(text: string): void {
  process.stdout.write(text);
}

export function writeLine(text: string = ""): void {
  process.stdout.write(text + "\x1B[K\n");
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
      (cp >= 0x1100 && cp <= 0x11ff) || // Hangul Jamo
      (cp >= 0x2e80 && cp <= 0x303f) || // CJK Radicals / Kangxi
      (cp >= 0x3040 && cp <= 0x33ff) || // Kana, Hangul Compat Jamo, CJK Compat
      (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
      (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
      (cp >= 0xac00 && cp <= 0xd7af) || // Hangul Syllables
      (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compat Ideographs
      (cp >= 0xff01 && cp <= 0xff60) || // Fullwidth Forms
      (cp >= 0xffe0 && cp <= 0xffe6); // Fullwidth Signs
    width += isWide ? 2 : 1;
  }
  return width;
}

export function renderHeader(title: string): void {
  const BOX = (process.stdout.columns || 80) - 2;
  const line = "─".repeat(BOX);
  writeLine(bold(cyan("┌" + line + "┐")));
  const titleWidth = displayWidth(title);
  const padding = Math.floor((BOX - titleWidth) / 2);
  const rightPad = BOX - padding - titleWidth;
  const paddedTitle = " ".repeat(padding) + title + " ".repeat(rightPad);
  writeLine(bold(cyan("│")) + bold(white(paddedTitle)) + bold(cyan("│")));
  writeLine(bold(cyan("└" + line + "┘")));
}

export function renderDivider(): void {
  writeLine(dim("─".repeat(52)));
}

export function renderTypingLine(
  targetText: string,
  typedChars: string[],
  currentIndex: number,
): void {
  const chars = [...targetText];
  let output = "";

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (i < currentIndex) {
      const typed = typedChars[i];
      if (typed === ch) {
        output += green(ch);
      } else {
        output += red(ch);
      }
    } else if (i === currentIndex) {
      output += chalk.bgWhite.black(ch);
    } else {
      output += dim(ch);
    }
  }

  write(output);
}
