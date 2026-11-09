import { describe, expect, it } from "vitest";
import { noteAuthor } from "./note-author";

describe("note authors", () => {
  const names = new Map([
    [1, "Ada"],
    [2, "Grace"],
  ]);

  it("uses the current account name for a signed-in note", () => {
    expect(noteAuthor({ author: "Old name", userId: 1 }, names)).toBe("Ada");
  });

  it("keeps the typed name on a shared-page note", () => {
    expect(noteAuthor({ author: "Sam", userId: null }, names)).toBe("Sam");
  });

  it("keeps the saved name when that account is gone", () => {
    expect(noteAuthor({ author: "Ada", userId: 9 }, names)).toBe("Ada");
  });
});
