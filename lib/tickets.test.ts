import { describe, expect, it } from "vitest";
import { todoBoardTicket } from "./tickets";

describe("board tickets", () => {
  it("links a to-do card to that item and keeps the due date fixed", () => {
    const ticket = todoBoardTicket(
      { id: 12, title: "Call the dentist", description: "Ask about the crown", dueDate: "2026-11-12", author: "Ada" },
      "http://192.168.10.62:3000/",
    );
    expect(ticket.kicker).toBe("To-do");
    expect(ticket.title).toBe("Call the dentist");
    expect(ticket.description).toBe("Ask about the crown");
    expect(ticket.due).toBe("Due Nov 12");
    expect(ticket.from).toBe("Ada");
    expect(ticket.url).toBe("http://192.168.10.62:3000/todos/12");
    expect(todoBoardTicket({ id: 1, title: "Test", description: "", dueDate: "2026-11-08" }, "http://localhost:3000").from).toBe(
      "",
    );
  });
});