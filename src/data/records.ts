import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { Language, Difficulty } from "../types";

export interface GameRecord {
  date: string;
  language: Language;
  difficulty: Difficulty;
  wpm: number;
  accuracy: number;
  elapsedMs: number;
  totalErrors: number;
  totalChars: number;
}

const DATA_DIR = join(homedir(), ".typrac");
const DATA_FILE = join(DATA_DIR, "results.json");

export function loadRecords(): GameRecord[] {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as GameRecord[];
  } catch {
    return [];
  }
}

export function saveRecord(record: GameRecord): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const records = loadRecords();
  records.push(record);
  writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

export function writeRecords(records: GameRecord[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}
