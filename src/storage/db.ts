import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';

const DB_NAME = 'mycycle.db';

let db: SQLite.SQLiteDatabase | null = null;

const CREATE_TABLE_SQL = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS logs (
    date TEXT PRIMARY KEY NOT NULL,
    temp REAL,
    tempUnit TEXT,
    tempQuestionable INTEGER NOT NULL DEFAULT 0,
    tempShift INTEGER NOT NULL DEFAULT 0,
    fluid TEXT,
    flow TEXT,
    sex TEXT,
    isCycleDayOne INTEGER NOT NULL DEFAULT 0,
    isPeak INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    symptoms TEXT
  );
`;

export type DailyLog = {
  date: string;
  temp: number | null;
  tempUnit: 'C' | 'F';
  tempQuestionable: boolean;
  tempShift: boolean;
  fluid: string | null;
  flow: string | null;
  sex: string | null;
  isCycleDayOne: boolean;
  isPeak: boolean;
  notes: string;
  symptoms: Record<string, number>;
};

type LogRow = {
  date: string;
  temp: number | null;
  tempUnit: string;
  tempQuestionable?: number;
  tempShift?: number;
  fluid: string | null;
  flow: string | null;
  sex: string | null;
  isCycleDayOne: number;
  isPeak: number;
  notes: string | null;
  symptoms: string | null;
};

function rowToLog(row: LogRow): DailyLog {
  let symptoms: Record<string, number> = {};
  if (row.symptoms) {
    try {
      symptoms = JSON.parse(row.symptoms) as Record<string, number>;
    } catch {
      symptoms = {};
    }
  }
  return {
    date: row.date,
    temp: row.temp,
    tempUnit: (row.tempUnit === 'F' ? 'F' : 'C') as 'C' | 'F',
    tempQuestionable: (row.tempQuestionable ?? 0) === 1,
    tempShift: (row.tempShift ?? 0) === 1,
    fluid: row.fluid,
    flow: row.flow,
    sex: row.sex,
    isCycleDayOne: row.isCycleDayOne === 1,
    isPeak: row.isPeak === 1,
    notes: row.notes ?? '',
    symptoms,
  };
}

/**
 * Initialize the database and create the logs table.
 * Call once at app startup. Safe to call multiple times.
 * On failure, shows an alert and the app continues without DB (getLogByDate returns null, getAllLogs returns [], saveDailyLog no-ops).
 */
export async function initDb(): Promise<void> {
  if (db) return;
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(CREATE_TABLE_SQL);
    try {
      await db.runAsync('ALTER TABLE logs ADD COLUMN tempQuestionable INTEGER NOT NULL DEFAULT 0');
    } catch {
      /* column may already exist */
    }
    try {
      await db.runAsync('ALTER TABLE logs ADD COLUMN tempShift INTEGER NOT NULL DEFAULT 0');
    } catch {
      /* column may already exist */
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not initialize the database.';
    Alert.alert('Database Error', message);
    db = null;
  }
}

/**
 * Insert or replace a log entry for the given date.
 */
export async function saveDailyLog(log: DailyLog): Promise<void> {
  if (!db) return;
  try {
    const symptomsJson = JSON.stringify(log.symptoms);
    await db.runAsync(
      `INSERT OR REPLACE INTO logs (date, temp, tempUnit, tempQuestionable, tempShift, fluid, flow, sex, isCycleDayOne, isPeak, notes, symptoms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      log.date,
      log.temp ?? null,
      log.tempUnit,
      log.tempQuestionable ? 1 : 0,
      log.tempShift ? 1 : 0,
      log.fluid ?? null,
      log.flow ?? null,
      log.sex ?? null,
      log.isCycleDayOne ? 1 : 0,
      log.isPeak ? 1 : 0,
      log.notes ?? '',
      symptomsJson
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save.';
    Alert.alert('Save Error', message);
  }
}

/**
 * Retrieve the log for a specific date (ISO date string, e.g. YYYY-MM-DD).
 * Returns null if no row or database is not initialized.
 */
export async function getLogByDate(date: string): Promise<DailyLog | null> {
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<LogRow>(
      'SELECT * FROM logs WHERE date = ?',
      date
    );
    if (!row) return null;
    return rowToLog(row);
  } catch {
    return null;
  }
}

/**
 * Fetch all logs, ordered by date ascending (for Chart / history).
 * Returns empty array if database is not initialized or has no rows.
 */
export async function getAllLogs(): Promise<DailyLog[]> {
  if (!db) return [];
  try {
    const rows = await db.getAllAsync<LogRow>('SELECT * FROM logs ORDER BY date ASC');
    return rows.map(rowToLog);
  } catch {
    return [];
  }
}
