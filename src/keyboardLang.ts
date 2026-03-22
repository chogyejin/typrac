import { execFile } from "child_process";
import type { Language } from "./types";
import { isKoreanChar, isEnglishLetter } from "./engine/input";

let currentLang: Language = "en";
let pollTimer: ReturnType<typeof setInterval> | null = null;
let querying = false;

export function getKeyboardLang(): Language {
  return currentLang;
}

export function updateKeyboardLangFromInput(input: string): void {
  if (input.startsWith("\x1b")) return;
  for (const ch of input) {
    if (isKoreanChar(ch)) {
      currentLang = "ko";
      return;
    }
    if (isEnglishLetter(ch)) {
      currentLang = "en";
      return;
    }
  }
}

function queryOSKeyboardLang(callback: (lang: Language | null) => void): void {
  const plist = `${process.env.HOME}/Library/Preferences/com.apple.HIToolbox.plist`;
  execFile(
    "defaults",
    ["read", plist, "AppleSelectedInputSources"],
    { timeout: 200 },
    (err, stdout) => {
      if (err) {
        callback(null);
        return;
      }
      callback(/korean|hangul/i.test(stdout) ? "ko" : "en");
    },
  );
}

export function startPolling(onUpdate: () => void): void {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => {
    if (querying) return;
    querying = true;
    queryOSKeyboardLang((lang) => {
      querying = false;
      if (lang !== null && lang !== currentLang) {
        currentLang = lang;
        onUpdate();
      }
    });
  }, 300);
}

export function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
    querying = false;
  }
}
