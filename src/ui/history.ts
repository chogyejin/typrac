import type { Countdown } from "../types";
import type { GameRecord } from "../data/records";
import { writeRecords } from "../data/records";
import {
  clearScreen,
  clearToEnd,
  writeLine,
  cyan,
  yellow,
  dim,
  green,
  bold,
  red,
  renderHeader,
  hideCursor,
  showCursor,
  padStartDW,
} from "./renderer";
import { isCtrlC, isEsc } from "../engine/input";
import { updateKeyboardLangFromInput, startPolling, stopPolling } from "../keyboardLang";
import { formatTime } from "../utils";

const DIFF_LABEL: Record<string, string> = {
  easy: "쉬움  ",
  medium: "보통  ",
  hard: "어려움",
};

const ARROW_UP = "\x1b[A";
const ARROW_DOWN = "\x1b[B";
const ARROW_LEFT = "\x1b[D";
const ARROW_RIGHT = "\x1b[C";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

type ConfirmState = { active: true; count: number } | { active: false };

type FlatRow = { record: GameRecord; originalIndex: number };

const DISPLAY_LIMIT = 10;

function buildAllRows(records: GameRecord[]): FlatRow[] {
  const withIdx = records.map((r, i) => ({ record: r, originalIndex: i }));
  const enRows = withIdx
    .filter(({ record: r }) => r.language === "en")
    .reverse()
    .slice(0, DISPLAY_LIMIT);
  const koRows = withIdx
    .filter(({ record: r }) => r.language === "ko")
    .reverse()
    .slice(0, DISPLAY_LIMIT);
  return [...enRows, ...koRows];
}

const TABLE_HEADER =
  "      # │ 날짜             │ 난이도 │  타수 │ 정확도 │      시간 │ 오류";
const TABLE_SEP =
  "────────┼──────────────────┼────────┼───────┼────────┼───────────┼─────";

function renderHistoryScreen(
  allRows: FlatRow[],
  totalEnCount: number,
  totalKoCount: number,
  page: number,
  pageSize: number,
  cursor: number,
  selected: Set<number>,
  confirm: ConfirmState,
  countdown?: Countdown,
): void {
  clearScreen();
  renderHeader("  TYPRAC — 기록  ");
  writeLine();

  if (allRows.length === 0) {
    writeLine("  " + dim("저장된 기록이 없습니다."));
    writeLine();
    writeLine("  " + dim("[Esc] 돌아가기"));
    clearToEnd();
    return;
  }

  const total = allRows.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize;
  const pageRows = allRows.slice(start, start + pageSize);

  const enTotal = allRows.filter(({ record: r }) => r.language === "en").length;
  const koTotal = allRows.length - enTotal;
  const enFull = totalEnCount === enTotal ? "" : `/${totalEnCount}`;
  const koFull = totalKoCount === koTotal ? "" : `/${totalKoCount}`;

  let lastLang: string | null = null;

  pageRows.forEach((row, idx) => {
    const globalIdx = start + idx;
    const lang = row.record.language;

    if (lang !== lastLang) {
      if (lastLang !== null) writeLine();
      const sectionTotal = lang === "en" ? enTotal : koTotal;
      const fullSuffix = lang === "en" ? enFull : koFull;
      const label = lang === "en" ? "영어" : "한국어";
      writeLine(
        "  " +
          bold(cyan(`▌ ${label}`)) +
          "  " +
          dim(`(${sectionTotal}${fullSuffix}개)`),
      );
      writeLine("  " + dim(TABLE_HEADER));
      writeLine("  " + dim(TABLE_SEP));
      lastLang = lang;
    }

    const isSelected = selected.has(globalIdx);
    const isCursor = cursor === globalIdx;
    const checkbox = isSelected ? cyan("[x]") : dim("[ ]");

    const rowNum =
      lang === "en" ? enTotal - globalIdx : koTotal - (globalIdx - enTotal);
    const num = String(rowNum).padStart(3, " ");

    const r = row.record;
    const date = formatDate(r.date);
    const diff = DIFF_LABEL[r.difficulty] ?? r.difficulty;
    const wpm = String(r.wpm).padStart(5, " ");
    const acc = (r.accuracy.toFixed(1) + "%").padStart(6, " ");
    const time = padStartDW(formatTime(r.elapsedMs), 9);
    const err = String(r.totalErrors).padStart(4, " ");

    const rowStr = `  ${checkbox} ${dim(num + " │")} ${date} ${dim("│")} ${diff} ${dim("│")} ${yellow(wpm)} ${dim("│")} ${green(acc)} ${dim("│")} ${time} ${dim("│")} ${err}`;

    if (isCursor) {
      writeLine(bold(rowStr));
    } else {
      writeLine(rowStr);
    }
  });

  writeLine();

  if (confirm.active) {
    writeLine(
      "  " +
        red(`선택한 ${confirm.count}개를 삭제합니다.`) +
        "  " +
        dim("[Enter] 확인   [Esc] 취소"),
    );
  } else {
    const selCount = selected.size;
    const pageHint =
      totalPages > 1 ? `[←→] 페이지(${page + 1}/${totalPages})   ` : "";
    if (selCount > 0) {
      writeLine(
        "  " +
          dim(
            `[↑↓] 이동   [Space] 선택   [A] 전체선택   ${pageHint}[Esc] 돌아가기`,
          ) +
          "   " +
          yellow(`${selCount}개 선택됨`) +
          dim("   [D] 삭제"),
      );
    } else {
      writeLine(
        "  " +
          dim(
            `[↑↓] 이동   [Space] 선택   [A] 전체선택   ${pageHint}[Esc] 돌아가기`,
          ),
      );
    }
  }

  if (countdown !== undefined) {
    const remaining = Math.max(
      0,
      countdown.limitMs - (Date.now() - countdown.start),
    );
    const totalSec = Math.ceil(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    writeLine(
      "  " +
        dim("남은 시간: ") +
        yellow(
          m > 0 ? `${m}분 ${s}초 후 프로세스 종료` : `${s}초 후 프로세스 종료`,
        ),
    );
  }

  clearToEnd();
}

export function showHistory(
  initialRecords: GameRecord[],
  countdown?: Countdown,
): Promise<void> {
  const PAGE_SIZE = 15;

  return new Promise((resolve) => {
    let records = [...initialRecords];
    let allRows = buildAllRows(records);
    let page = 0;
    let cursor = 0;
    const selected = new Set<number>();
    let confirm: ConfirmState = { active: false };

    function totalPages(): number {
      return Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
    }

    function clampCursor(): void {
      if (allRows.length === 0) {
        cursor = 0;
        return;
      }
      const pageStart = page * PAGE_SIZE;
      const pageEnd = Math.min(pageStart + PAGE_SIZE, allRows.length) - 1;
      cursor = Math.max(pageStart, Math.min(cursor, pageEnd));
    }

    const render = () => {
      const totalEnCount = records.filter((r) => r.language === "en").length;
      const totalKoCount = records.filter((r) => r.language === "ko").length;
      renderHistoryScreen(
        allRows,
        totalEnCount,
        totalKoCount,
        page,
        PAGE_SIZE,
        cursor,
        selected,
        confirm,
        countdown,
      );
    };

    hideCursor();
    render();
    startPolling(render);

    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    function onData(key: string): void {
      updateKeyboardLangFromInput(key);
      if (isCtrlC(key)) {
        cleanup();
        showCursor();
        process.exit(0);
      }

      if (confirm.active) {
        if (key === "\r" || key === "\n") {
          const toDelete = new Set(
            [...selected].map((i) => allRows[i].originalIndex),
          );
          records = records.filter((_, i) => !toDelete.has(i));
          allRows = buildAllRows(records);
          writeRecords(records);
          selected.clear();
          confirm = { active: false };
          page = Math.min(page, totalPages() - 1);
          clampCursor();
        } else if (isEsc(key)) {
          confirm = { active: false };
        }
        render();
        return;
      }

      if (isEsc(key)) {
        if (selected.size > 0) {
          selected.clear();
          render();
        } else {
          cleanup();
          resolve();
        }
        return;
      }

      if (allRows.length === 0) return;

      if (key === ARROW_UP) {
        if (cursor > page * PAGE_SIZE) {
          cursor--;
        } else if (page > 0) {
          page--;
          cursor = Math.min(
            page * PAGE_SIZE + PAGE_SIZE - 1,
            allRows.length - 1,
          );
        }
        render();
        return;
      }

      if (key === ARROW_DOWN) {
        const lastOnPage =
          Math.min((page + 1) * PAGE_SIZE, allRows.length) - 1;
        if (cursor < lastOnPage) {
          cursor++;
        } else if (page < totalPages() - 1) {
          page++;
          cursor = page * PAGE_SIZE;
        }
        render();
        return;
      }

      if (key === ARROW_LEFT && page > 0) {
        page--;
        cursor = page * PAGE_SIZE;
        render();
        return;
      }

      if (key === ARROW_RIGHT && page < totalPages() - 1) {
        page++;
        cursor = page * PAGE_SIZE;
        render();
        return;
      }

      if (key === " ") {
        if (selected.has(cursor)) {
          selected.delete(cursor);
        } else {
          selected.add(cursor);
        }
        render();
        return;
      }

      if (key === "a" || key === "A") {
        const pageIndices = Array.from(
          { length: Math.min(PAGE_SIZE, allRows.length - page * PAGE_SIZE) },
          (_, i) => page * PAGE_SIZE + i,
        );
        const allSelected = pageIndices.every((i) => selected.has(i));
        if (allSelected) {
          pageIndices.forEach((i) => selected.delete(i));
        } else {
          pageIndices.forEach((i) => selected.add(i));
        }
        render();
        return;
      }

      if ((key === "d" || key === "D") && selected.size > 0) {
        confirm = { active: true, count: selected.size };
        render();
        return;
      }
    }

    function cleanup(): void {
      stopPolling();
      showCursor();
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on("data", onData);
  });
}
