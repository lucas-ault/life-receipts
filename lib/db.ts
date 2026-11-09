import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import * as schema from "@/db/schema";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  password_hash TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  units TEXT NOT NULL DEFAULT 'f',
  print_time TEXT NOT NULL DEFAULT '07:00',
  print_enabled INTEGER NOT NULL DEFAULT 0,
  printer_host TEXT NOT NULL DEFAULT '',
  printer_port INTEGER NOT NULL DEFAULT 9100,
  paper_width TEXT NOT NULL DEFAULT '80',
  google_refresh_token TEXT,
  selected_calendar_id TEXT,
  selected_calendar_name TEXT,
  public_token TEXT NOT NULL,
  headline_limit INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timezone TEXT NOT NULL DEFAULT '',
  weather_enabled INTEGER NOT NULL DEFAULT 1,
  headlines_enabled INTEGER NOT NULL DEFAULT 1,
  rss_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT,
  user_id INTEGER,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  printed_at INTEGER
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_by INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  card_printed_at INTEGER
);
CREATE TABLE IF NOT EXISTS todo_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  user_id INTEGER,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS print_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_key TEXT NOT NULL,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  error TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);
`;

const globalForDb = globalThis as unknown as {
  roundupSqlite?: Database.Database;
  roundupDb?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getDb() {
  if (!globalForDb.roundupDb || !globalForDb.roundupSqlite) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const sqlite = new Database(path.join(dir, "roundup.sqlite"));
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec(SCHEMA);
    const db = drizzle(sqlite, { schema });
    const existing = sqlite.prepare("SELECT id FROM settings WHERE id = 1").get();
    if (!existing) {
      db.insert(schema.settings)
        .values({
          id: 1,
          timezone: "America/Los_Angeles",
          units: "f",
          printTime: "07:00",
          printEnabled: false,
          printerHost: "",
          printerPort: 9100,
          paperWidth: "80",
          publicToken: randomBytes(24).toString("hex"),
          headlineLimit: 3,
          createdAt: Date.now(),
        })
        .run();
    }
    globalForDb.roundupSqlite = sqlite;
    globalForDb.roundupDb = db;
  }
  globalForDb.roundupSqlite.exec(SCHEMA);
  ensureTodoColumns(globalForDb.roundupSqlite);
  ensureNoteColumns(globalForDb.roundupSqlite);
  ensureOwner(globalForDb.roundupSqlite);
  return globalForDb.roundupDb;
}

function ensureTodoColumns(sqlite: Database.Database) {
  const columns = sqlite.prepare("PRAGMA table_info(todos)").all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("card_printed_at")) sqlite.exec("ALTER TABLE todos ADD COLUMN card_printed_at INTEGER");
  if (!names.has("description")) sqlite.exec("ALTER TABLE todos ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  if (!names.has("created_by")) sqlite.exec("ALTER TABLE todos ADD COLUMN created_by INTEGER");
}

function ensureNoteColumns(sqlite: Database.Database) {
  const columns = sqlite.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "user_id")) sqlite.exec("ALTER TABLE notes ADD COLUMN user_id INTEGER");
}

function ensureOwner(sqlite: Database.Database) {
  const count = sqlite.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;
  const settings = sqlite.prepare("SELECT password_hash FROM settings WHERE id = 1").get() as
    | { password_hash: string | null }
    | undefined;
  if (!settings?.password_hash) return;
  sqlite
    .prepare("INSERT INTO users (name, username, password_hash, role, created_at) VALUES ('Owner', 'owner', ?, 'owner', ?)")
    .run(settings.password_hash, Date.now());
}
