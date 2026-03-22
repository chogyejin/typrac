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

export function isPrintable(key: string): boolean {
  if (key.length === 0) return false;
  const code = key.codePointAt(0)!;
  // Control characters (< 0x20) and DEL (0x7f)
  if (code < 0x20 || code === 0x7f) return false;
  // Escape sequences (multi-byte starting with ESC)
  if (key.startsWith("\u001b")) return false;
  return true;
}
