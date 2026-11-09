import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { drawWeatherIcon, iconKind } from "./icons";

describe("weather icons", () => {
  it("groups forecast codes into printable symbols", () => {
    expect(iconKind(0)).toBe("clear");
    expect(iconKind(1)).toBe("mostly-clear");
    expect(iconKind(2)).toBe("partly");
    expect(iconKind(3)).toBe("overcast");
    expect(iconKind(45)).toBe("fog");
    expect(iconKind(51)).toBe("drizzle");
    expect(iconKind(63)).toBe("rain");
    expect(iconKind(65)).toBe("heavy-rain");
    expect(iconKind(73)).toBe("snow");
    expect(iconKind(95)).toBe("thunder");
    expect(iconKind(null)).toBe("overcast");
  });

  it("draws each symbol in solid ink", () => {
    const codes = [0, 1, 2, 3, 45, 51, 63, 65, 73, 95];
    const signatures = codes.map((code) => {
      const canvas = createCanvas(48, 48);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 48, 48);
      drawWeatherIcon(ctx, code, 0, 0, 48);
      const data = ctx.getImageData(0, 0, 48, 48).data;
      let dark = 0;
      let signature = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] < 80) {
          dark += 1;
          signature += index;
        }
      }
      expect(dark).toBeGreaterThan(30);
      return signature;
    });
    expect(new Set(signatures).size).toBe(codes.length);
  });
});
