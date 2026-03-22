import type { Language, Difficulty, Mode, Countdown } from "../types";
import {
  clearScreen,
  clearToEnd,
  writeLine,
  bold,
  cyan,
  yellow,
  dim,
  white,
  renderDivider,
  renderHeader,
  hideCursor,
  showCursor,
  formatCountdown,
} from "./renderer";
import { isCtrlC } from "../engine/input";

const ARROW_UP = "\x1b[A";
const ARROW_DOWN = "\x1b[B";

interface Option {
  label: string;
  description: string;
}

function renderMenu(
  title: string,
  subtitle: string,
  options: Option[],
  selectedIndex: number,
  countdown?: Countdown,
  exitPending = false,
  showBack = true,
): void {
  clearScreen();
  renderHeader(title);
  writeLine();
  writeLine("  " + bold(subtitle));
  writeLine();

  options.forEach((opt, i) => {
    const num = dim(`[${i + 1}]`);
    if (i === selectedIndex) {
      writeLine(
        "    " +
          bold(cyan("❯")) +
          " " +
          num +
          "  " +
          bold(white(opt.label)) +
          dim("  " + opt.description),
      );
    } else {
      writeLine(
        "      " + num + "  " + opt.label + dim("  " + opt.description),
      );
    }
  });

  writeLine();
  renderDivider();
  if (exitPending) {
    writeLine("  " + yellow("한 번 더 누르면 종료됩니다."));
  } else if (showBack) {
    writeLine(
      "  " + dim("[↑↓] 이동   [Enter] 선택   [Esc] 이전 메뉴   [Ctrl+C] 종료"),
    );
  } else {
    writeLine("  " + dim("[↑↓] 이동   [Enter] 선택   [Ctrl+C] 종료"));
  }
  if (countdown !== undefined) {
    writeLine("  " + dim("남은 시간: ") + yellow(formatCountdown(countdown)));
  }
  clearToEnd();
}

function selectOption(
  title: string,
  subtitle: string,
  options: Option[],
  countdown?: Countdown,
  showBack = true,
): Promise<number | null> {
  return new Promise((resolve) => {
    let selected = 0;
    let exitPending = false;
    let exitTimer: ReturnType<typeof setTimeout> | null = null;

    const render = () =>
      renderMenu(
        title,
        subtitle,
        options,
        selected,
        countdown,
        exitPending,
        showBack,
      );

    hideCursor();
    render();

    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    const ticker =
      countdown !== undefined ? setInterval(() => render(), 100) : null;

    function onData(key: string): void {
      if (isCtrlC(key)) {
        if (exitPending) {
          cleanup();
          showCursor();
          process.exit(0);
        }
        exitPending = true;
        render();
        exitTimer = setTimeout(() => {
          exitPending = false;
          exitTimer = null;
          render();
        }, 2000);
        return;
      }
      if (key === "\x1b") {
        cleanup();
        resolve(null);
        return;
      }
      if (exitPending) {
        exitPending = false;
        if (exitTimer) {
          clearTimeout(exitTimer);
          exitTimer = null;
        }
        render();
      }
      if (key === ARROW_UP) {
        selected = (selected - 1 + options.length) % options.length;
        render();
        return;
      }
      if (key === ARROW_DOWN) {
        selected = (selected + 1) % options.length;
        render();
        return;
      }
      if (key === "\r" || key === "\n") {
        cleanup();
        resolve(selected);
        return;
      }
    }

    function cleanup(): void {
      if (ticker) clearInterval(ticker);
      if (exitTimer) clearTimeout(exitTimer);
      showCursor();
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on("data", onData);
  });
}

export async function selectLanguage(
  countdown?: Countdown,
): Promise<Language | null> {
  const options: Option[] = [
    { label: "English", description: "영어" },
    { label: "한국어", description: "Korean" },
  ];
  const i = await selectOption(
    "  TYPRAC — 타자 연습  ",
    "언어 선택:",
    options,
    countdown,
    false,
  );
  if (i === null) return null;
  return i === 0 ? "en" : "ko";
}

export async function selectMode(
  lang: Language,
  countdown?: Countdown,
): Promise<Mode | null> {
  const jamoLabel = lang === "ko" ? "자모음 모드" : "알파벳 모드";
  const jamoDesc =
    lang === "ko" ? "낱자(자음·모음) 연습" : "낱자(알파벳·숫자) 연습";
  const options: Option[] = [
    { label: "일반 모드", description: "단어·문장 연습" },
    { label: jamoLabel, description: jamoDesc },
  ];
  const i = await selectOption(
    "  TYPRAC — 모드 선택  ",
    "모드 선택:",
    options,
    countdown,
  );
  if (i === null) return null;
  return i === 0 ? "normal" : "jamo";
}

export async function selectDifficulty(
  mode: Mode = "normal",
  countdown?: Countdown,
): Promise<Difficulty | null> {
  const isJamo = mode === "jamo";
  const options: Option[] = [
    {
      label: "쉬움",
      description: isJamo ? "기본 자음 / 소문자" : "짧고 간단한 문장",
    },
    {
      label: "보통",
      description: isJamo ? "자음+모음 / 대소문자" : "구두점 포함 일반 문장",
    },
    {
      label: "어려움",
      description: isJamo
        ? "쌍자음+복합모음 / 대소문자+숫자"
        : "기호·숫자 포함 복잡한 문장",
    },
  ];
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const i = await selectOption(
    "  TYPRAC — 난이도 선택  ",
    "난이도 선택:",
    options,
    countdown,
  );
  if (i === null) return null;
  return difficulties[i];
}
