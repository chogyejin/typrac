export function isCtrlC(key: string): boolean {
  return key === "\u0003";
}

export function isEsc(key: string): boolean {
  return key === "\u001b";
}

export function isBackspace(key: string): boolean {
  return key === "\u007f" || key === "\b";
}

export function isEnter(key: string): boolean {
  return key === "\r" || key === "\n";
}

export function isCtrlR(key: string): boolean {
  return key === "\u0012";
}

export function isKoreanChar(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (
    (cp >= 0xac00 && cp <= 0xd7af) || // 한글 음절
    (cp >= 0x1100 && cp <= 0x11ff) || // 한글 자모
    (cp >= 0x3130 && cp <= 0x318f)    // 한글 호환 자모
  );
}

export function isEnglishLetter(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a);
}

export function isPrintable(key: string): boolean {
  if (key.length === 0) return false;
  const code = key.codePointAt(0)!;
  // Control characters (< 0x20) and DEL (0x7f)
  if (code < 0x20 || code === 0x7f) return false;
  // Escape sequences (multi-byte starting with ESC)
  if (key.startsWith("\u001b")) return false;
  return true;
}
