import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  passwordHash: text("password_hash"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  units: text("units").notNull().default("f"),
  printTime: text("print_time").notNull().default("07:00"),
  printEnabled: integer("print_enabled", { mode: "boolean" }).notNull().default(false),
  printerHost: text("printer_host").notNull().default(""),
  printerPort: integer("printer_port").notNull().default(9100),
  paperWidth: text("paper_width").notNull().default("80"),
  googleRefreshToken: text("google_refresh_token"),
  selectedCalendarId: text("selected_calendar_id"),
  selectedCalendarName: text("selected_calendar_name"),
  publicToken: text("public_token").notNull(),
  headlineLimit: integer("headline_limit").notNull().default(3),
  createdAt: integer("created_at").notNull(),
});

export const places = sqliteTable("places", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  detail: text("detail").notNull().default(""),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timezone: text("timezone").notNull().default(""),
  weatherEnabled: integer("weather_enabled", { mode: "boolean" }).notNull().default(true),
  headlinesEnabled: integer("headlines_enabled", { mode: "boolean" }).notNull().default(true),
  rssUrl: text("rss_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author"),
  userId: integer("user_id"),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  source: text("source").notNull(),
  createdAt: integer("created_at").notNull(),
  printedAt: integer("printed_at"),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("new"),
  createdBy: integer("created_by"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  cardPrintedAt: integer("card_printed_at"),
});

export const todoNotes = sqliteTable("todo_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  todoId: integer("todo_id").notNull(),
  userId: integer("user_id"),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const printJobs = sqliteTable("print_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull(),
  status: text("status").notNull(),
  trigger: text("trigger").notNull(),
  error: text("error"),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
});

export type Settings = typeof settings.$inferSelect;
export type Place = typeof places.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type User = typeof users.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type TodoNote = typeof todoNotes.$inferSelect;
export type PrintJob = typeof printJobs.$inferSelect;
