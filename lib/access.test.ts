import { describe, expect, it } from "vitest";
import { canSeeTodo, initialTodoStatus, memberCanEditTodo, memberMayOpen } from "./access";

describe("access", () => {
  it("starts a member to-do as pending and an owner to-do as new", () => {
    expect(initialTodoStatus("member")).toBe("pending");
    expect(initialTodoStatus("owner")).toBe("new");
  });

  it("lets members open notes and to-dos only", () => {
    expect(memberMayOpen("/todos")).toBe(true);
    expect(memberMayOpen("/todos/4")).toBe(true);
    expect(memberMayOpen("/notes")).toBe(true);
    expect(memberMayOpen("/")).toBe(false);
    expect(memberMayOpen("/printer")).toBe(false);
    expect(memberMayOpen("/users")).toBe(false);
  });

  it("hides another person's pending to-do and locks edits after approval", () => {
    const pending = { createdBy: 2, status: "pending" };
    expect(canSeeTodo("member", pending, 2)).toBe(true);
    expect(canSeeTodo("member", pending, 3)).toBe(false);
    expect(canSeeTodo("owner", pending, 1)).toBe(true);
    expect(memberCanEditTodo(pending, 2)).toBe(true);
    expect(memberCanEditTodo({ createdBy: 2, status: "new" }, 2)).toBe(false);
  });
});
