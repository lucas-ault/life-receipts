import "server-only";

import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";
import {
  notes,
  places,
  printJobs,
  settings,
  todoNotes,
  todos,
  users,
  type Note,
  type Place,
  type PrintJob,
  type Settings,
  type Todo,
  type TodoNote,
  type User,
} from "@/db/schema";
import type { TodoStatus } from "./todos";
import { getDb } from "./db";

export function getSettings(): Settings {
  const row = getDb().select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) throw new Error("Settings are missing.");
  return row;
}

export function updateSettings(patch: Partial<Omit<Settings, "id" | "createdAt">>) {
  getDb().update(settings).set(patch).where(eq(settings.id, 1)).run();
}

export function listPlaces(): Place[] {
  return getDb().select().from(places).orderBy(asc(places.sortOrder), asc(places.id)).all();
}

export function insertPlace(place: Omit<Place, "id" | "sortOrder">) {
  const current = listPlaces();
  const sortOrder = current.length === 0 ? 0 : Math.max(...current.map((item) => item.sortOrder)) + 1;
  const result = getDb().insert(places).values({ ...place, sortOrder }).run();
  return Number(result.lastInsertRowid);
}

export function updatePlace(id: number, patch: Partial<Omit<Place, "id">>) {
  getDb().update(places).set(patch).where(eq(places.id, id)).run();
}

export function deletePlace(id: number) {
  getDb().delete(places).where(eq(places.id, id)).run();
}

export function movePlace(id: number, direction: "up" | "down") {
  const current = listPlaces();
  const index = current.findIndex((place) => place.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= current.length) return;
  const next = current.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  const db = getDb();
  next.forEach((place, sortOrder) => {
    db.update(places).set({ sortOrder }).where(eq(places.id, place.id)).run();
  });
}

export function getOwner(): User | undefined {
  return getDb().select().from(users).where(eq(users.role, "owner")).get();
}

export function listUsers(): User[] {
  return getDb().select().from(users).orderBy(asc(users.id)).all();
}

export function getUser(id: number): User | undefined {
  return getDb().select().from(users).where(eq(users.id, id)).get();
}

export function getUserByUsername(username: string): User | undefined {
  return getDb().select().from(users).where(eq(users.username, username)).get();
}

export function insertUser(user: { name: string; username: string; passwordHash: string; role: "owner" | "member" }) {
  const result = getDb()
    .insert(users)
    .values({ ...user, createdAt: Date.now() })
    .run();
  return Number(result.lastInsertRowid);
}

export function updateUser(id: number, patch: { name?: string; username?: string; passwordHash?: string }) {
  getDb().update(users).set(patch).where(eq(users.id, id)).run();
}

export function deleteUser(id: number) {
  const db = getDb();
  const now = Date.now();
  db.update(todos).set({ createdBy: null, updatedAt: now }).where(eq(todos.createdBy, id)).run();
  db.update(notes).set({ userId: null }).where(eq(notes.userId, id)).run();
  db.update(todoNotes).set({ userId: null }).where(eq(todoNotes.userId, id)).run();
  db.delete(users).where(eq(users.id, id)).run();
}

export function listPendingNotes(): Note[] {
  return getDb().select().from(notes).where(eq(notes.status, "pending")).orderBy(asc(notes.createdAt)).all();
}

export function insertNote(note: { author: string | null; userId?: number | null; body: string; source: "admin" | "public" }) {
  const result = getDb()
    .insert(notes)
    .values({ ...note, status: "pending", createdAt: Date.now() })
    .run();
  return Number(result.lastInsertRowid);
}

export function dismissNote(id: number) {
  getDb().update(notes).set({ status: "dismissed" }).where(and(eq(notes.id, id), eq(notes.status, "pending"))).run();
}

export function markNotesPrinted(ids: number[], printedAt = Date.now()) {
  if (ids.length === 0) return;
  const db = getDb();
  for (const id of ids) {
    db.update(notes)
      .set({ status: "printed", printedAt })
      .where(and(eq(notes.id, id), eq(notes.status, "pending")))
      .run();
  }
}

export function listTodos(): Todo[] {
  return getDb().select().from(todos).orderBy(asc(todos.dueDate), asc(todos.id)).all();
}

export function listOpenTodos(): Todo[] {
  return getDb()
    .select()
    .from(todos)
    .where(or(eq(todos.status, "new"), eq(todos.status, "in_progress")))
    .orderBy(asc(todos.dueDate), asc(todos.id))
    .all();
}

export function getTodo(id: number) {
  return getDb().select().from(todos).where(eq(todos.id, id)).get();
}

export function listUnprintedTodoCards(): Todo[] {
  return getDb()
    .select()
    .from(todos)
    .where(and(or(eq(todos.status, "new"), eq(todos.status, "in_progress")), isNull(todos.cardPrintedAt)))
    .orderBy(asc(todos.dueDate), asc(todos.id))
    .all();
}

export function markTodoCardPrinted(id: number, printedAt = Date.now()) {
  getDb().update(todos).set({ cardPrintedAt: printedAt, updatedAt: printedAt }).where(eq(todos.id, id)).run();
}

export function insertTodo(todo: {
  title: string;
  description: string;
  dueDate: string;
  status: TodoStatus;
  createdBy: number;
}) {
  const now = Date.now();
  const result = getDb().insert(todos).values({ ...todo, createdAt: now, updatedAt: now }).run();
  return Number(result.lastInsertRowid);
}

export function updateTodo(
  id: number,
  patch: { title?: string; description?: string; dueDate?: string; status?: TodoStatus },
) {
  getDb()
    .update(todos)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(todos.id, id))
    .run();
}

export function deleteTodo(id: number) {
  const db = getDb();
  db.delete(todoNotes).where(eq(todoNotes.todoId, id)).run();
  db.delete(todos).where(eq(todos.id, id)).run();
}

export function listTodoNotes(todoId?: number): TodoNote[] {
  const db = getDb();
  if (todoId == null) return db.select().from(todoNotes).orderBy(asc(todoNotes.createdAt)).all();
  return db.select().from(todoNotes).where(eq(todoNotes.todoId, todoId)).orderBy(asc(todoNotes.createdAt)).all();
}

export function insertTodoNote(note: { todoId: number; userId: number; body: string }) {
  const result = getDb()
    .insert(todoNotes)
    .values({ ...note, createdAt: Date.now() })
    .run();
  return Number(result.lastInsertRowid);
}

export function insertJob(job: { dateKey: string; status: string; trigger: string; startedAt: number }) {
  const result = getDb().insert(printJobs).values(job).run();
  return Number(result.lastInsertRowid);
}

export function finishJob(id: number, status: "success" | "failed", error?: string) {
  getDb()
    .update(printJobs)
    .set({ status, error: error ?? null, finishedAt: Date.now() })
    .where(eq(printJobs.id, id))
    .run();
}

export function latestJob(): PrintJob | undefined {
  return getDb().select().from(printJobs).orderBy(desc(printJobs.id)).limit(1).get();
}

export function scheduledSuccess(dateKey: string) {
  return getDb()
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.dateKey, dateKey), eq(printJobs.trigger, "schedule"), eq(printJobs.status, "success")))
    .get();
}

export function failStaleJobs(now = Date.now()) {
  getDb()
    .update(printJobs)
    .set({ status: "failed", error: "The print was interrupted.", finishedAt: now })
    .where(and(eq(printJobs.status, "running"), lt(printJobs.startedAt, now - 2 * 60 * 1000)))
    .run();
}

export function hasFreshRunning(now = Date.now()) {
  return getDb()
    .select()
    .from(printJobs)
    .where(eq(printJobs.status, "running"))
    .all()
    .some((job) => job.startedAt > now - 2 * 60 * 1000);
}
