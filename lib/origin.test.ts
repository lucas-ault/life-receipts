import { describe, expect, it } from "vitest";
import { phoneOrigin, safeNextPath } from "./origin";

describe("phone origin", () => {
  it("keeps a public app url and replaces localhost with the lan address", () => {
    expect(phoneOrigin("https://roundup.example", ["192.168.10.62"])).toBe("https://roundup.example");
    expect(phoneOrigin("http://localhost:3000", ["192.168.10.62"])).toBe("http://192.168.10.62:3000");
    expect(phoneOrigin("http://127.0.0.1:3000", [])).toBe("http://127.0.0.1:3000");
  });

  it("only accepts an in-app path after sign-in", () => {
    expect(safeNextPath("/todos")).toBe("/todos");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("/\\todos")).toBeNull();
  });
});