import { describe, expect, it } from "vitest";
import { packMono, rgbaToEscPos } from "./escpos";

describe("escpos raster", () => {
  it("sets a bit for a dark pixel and leaves paper white", () => {
    const rgba = new Uint8Array(8 * 4);
    rgba.fill(255);
    rgba[0] = 0;
    rgba[1] = 0;
    rgba[2] = 0;
    expect(packMono(rgba, 8, 1)[0]).toBe(0x80);
  });

  it("frames a strip with GS v 0, then feeds and cuts", () => {
    const rgba = new Uint8Array(8 * 4).fill(255);
    const bytes = rgbaToEscPos(rgba, 8, 1);
    expect([...bytes.subarray(0, 11)]).toEqual([0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
    expect([...bytes.subarray(bytes.length - 6)]).toEqual([0x1b, 0x64, 0x04, 0x1d, 0x56, 0x01]);
  });
});
