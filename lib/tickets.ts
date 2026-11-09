import { formatMonthDay } from "./time";

export type BoardTicket = {
  kicker: string;
  title: string;
  description: string;
  due: string;
  url: string;
};

export function todoBoardTicket(
  todo: { id: number; title: string; description: string; dueDate: string },
  origin: string,
): BoardTicket {
  return {
    kicker: "To-do",
    title: todo.title,
    description: todo.description.replace(/\s+/g, " ").trim(),
    due: `Due ${formatMonthDay(todo.dueDate)}`,
    url: `${origin.replace(/\/$/, "")}/todos/${todo.id}`,
  };
}
