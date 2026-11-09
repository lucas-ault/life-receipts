export const TODO_STATUSES = ["pending", "new", "in_progress", "done"] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  pending: "Pending",
  new: "New",
  in_progress: "In progress",
  done: "Done",
};

export const BOARD_STATUSES = ["pending", "new", "in_progress", "done"] as const;

export function isTodoStatus(value: unknown): value is TodoStatus {
  return value === "pending" || value === "new" || value === "in_progress" || value === "done";
}
