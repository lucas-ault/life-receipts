import { describe, expect, it } from "vitest";
import { browserOrigin, phoneOrigin, safeNextPath } from "./origin";

describe("phone origin", () => {
  it("keeps a public app url and replaces localhost with the lan address", () => {
    expect(phoneOrigin("https://roundup.example", ["192.168.10.62"])).toBe("https://roundup.example");
    expect(phoneOrigin("http://localhost:3000", ["192.168.10.62"])).toBe("http://192.168.10.62:3000");
    expect(phoneOrigin("http://127.0.0.1:3000", [])).toBe("http://127.0.0.1:3000");
  });

  it("sends the browser to APP_URL instead of the container bind address", () => {
    expect(browserOrigin("http://0.0.0.0:3000/api/calendar/callback", "http://192.168.10.62:3000")).toBe(
      "http://192.168.10.62:3000",
    );
    expect(browserOrigin("http://0.0.0.0:3000/api/calendar/callback", "https://receipts.example/")).toBe(
      "https://receipts.example",
    );
    expect(browserOrigin("http://0.0.0.0:3000/api/calendar/callback", undefined)).toBe("http://localhost:3000");
    expect(browserOrigin("http://192.168.1.20:3000/calendar", "")).toBe("http://192.168.1.20:3000");
  });

  it("only accepts an in-app path after sign-in", () => {
    expect(safeNextPath("/todos")).toBe("/todos");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("/\\todos")).toBeNull();
  });
});