import type { TodoStatus } from "./todos";

export type Role = "owner" | "member";

export function isRole(value: unknown): value is Role {
  return value === "owner" || value === "member";
}

export function initialTodoStatus(role: Role): TodoStatus {
  return role === "member" ? "pending" : "new";
}

export function memberMayOpen(pathname: string) {
  return pathname === "/notes" || pathname === "/todos" || pathname.startsWith("/todos/");
}

export function memberCanEditTodo(todo: { createdBy: number | null; status: string }, userId: number) {
  return todo.createdBy === userId && todo.status === "pending";
}

export function canSeeTodo(role: Role, todo: { createdBy: number | null; status: string }, userId: number) {
  if (role === "owner") return true;
  if (todo.status !== "pending") return true;
  return todo.createdBy === userId;
}
