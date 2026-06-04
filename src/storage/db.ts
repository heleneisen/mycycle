import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';
import { AsyncStorage } from 'expo-sqlite/kv-store';

const DB_NAME = 'mycycle.db';
const API_URL = '/api/logs';

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
    symptoms TEXT,
    form TEXT
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
  form: string | null;
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
  form?: string | null;
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
    form: row.form ?? null,
  };
}

export async function initDb(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (db) return;
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(CREATE_TABLE_SQL);
    const migrations = [
      'ALTER TABLE logs ADD COLUMN tempQuestionable INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE logs ADD COLUMN tempShift INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE logs ADD COLUMN form TEXT',
    ];
    for (const sql of migrations) {
      try { await db.runAsync(sql); } catch { /* column may already exist */ }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not initialize the database.';
    Alert.alert('Database Error', message);
    db = null;
  }
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
      if (!res.ok) console.error('[db] saveDailyLog failed:', res.status, await res.text());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save.';
      Alert.alert('Save Error', message);
    }
    return;
  }
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO logs (date, temp, tempUnit, tempQuestionable, tempShift, fluid, flow, sex, isCycleDayOne, isPeak, notes, symptoms, form)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      JSON.stringify(log.symptoms),
      log.form ?? null
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save.';
    Alert.alert('Save Error', message);
  }
}

export async function getLogByDate(date: string): Promise<DailyLog | null> {
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(`${API_URL}?date=${encodeURIComponent(date)}`);
      if (!res.ok) return null;
      return await res.json() as DailyLog | null;
    } catch {
      return null;
    }
  }
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<LogRow>('SELECT * FROM logs WHERE date = ?', date);
    if (!row) return null;
    return rowToLog(row);
  } catch {
    return null;
  }
}

export async function getAllLogs(): Promise<DailyLog[]> {
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) return [];
      return await res.json() as DailyLog[];
    } catch {
      return [];
    }
  }
  if (!db) return [];
  try {
    const rows = await db.getAllAsync<LogRow>('SELECT * FROM logs ORDER BY date ASC');
    return rows.map(rowToLog);
  } catch {
    return [];
  }
}

// ── Custom symptom name list ─────────────────────────────────────────────────

const CUSTOM_SYMPTOMS_KEY = 'savedCustomSymptoms';

export async function getCustomSymptoms(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_SYMPTOMS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function persistCustomSymptom(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = await getCustomSymptoms();
  if (existing.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
  await AsyncStorage.setItem(CUSTOM_SYMPTOMS_KEY, JSON.stringify([...existing, trimmed]));
}
