import { describe, expect, it } from "vitest";
import { qrMatrix } from "./qr";

describe("receipt qr", () => {
  it("draws a finder pattern for the to-do page", () => {
    const matrix = qrMatrix("http://192.168.10.62:3000/todos");
    expect(matrix.size).toBeGreaterThan(20);
    expect(matrix.cells).toHaveLength(matrix.size * matrix.size);
    expect(matrix.cells[0]).toBe(true);
    expect(matrix.cells[matrix.size - 1]).toBe(true);
    expect(matrix.cells[(matrix.size - 1) * matrix.size]).toBe(true);
  });
});