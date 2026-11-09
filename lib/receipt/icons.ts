import type { SKRSContext2D } from "@napi-rs/canvas";

const INK = "#16130f";

export type IconKind =
  | "clear"
  | "mostly-clear"
  | "partly"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "snow"
  | "thunder";

export function iconKind(code: number | null | undefined): IconKind {
  if (code == null || Number.isNaN(code)) return "overcast";
  if (code <= 0) return "clear";
  if (code === 1) return "mostly-clear";
  if (code === 2) return "partly";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code === 65 || code === 67 || code === 82) return "heavy-rain";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunder";
  return "overcast";
}

export function drawWeatherIcon(ctx: SKRSContext2D, code: number | null, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 48, size / 48);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 3;
  const kind = iconKind(code);
  if (kind === "clear") sun(ctx, 24, 24, 8, 8);
  else if (kind === "mostly-clear") {
    sun(ctx, 20, 18, 7, 6);
    cloud(ctx, 8, 16, 0.72, true);
  } else if (kind === "partly") {
    sun(ctx, 32, 16, 6, 5);
    cloud(ctx, 0, 10, 0.86, true);
  } else if (kind === "overcast") cloud(ctx, 2, 8, 0.95, false);
  else if (kind === "fog") fog(ctx);
  else if (kind === "drizzle") {
    cloud(ctx, 2, 0, 0.9, false);
    drops(ctx, 2, 6, 35);
  } else if (kind === "rain") {
    cloud(ctx, 2, 0, 0.9, false);
    drops(ctx, 3, 9, 34);
  } else if (kind === "heavy-rain") {
    cloud(ctx, 2, 0, 0.9, false);
    drops(ctx, 4, 11, 33);
  } else if (kind === "snow") {
    cloud(ctx, 2, 0, 0.9, false);
    flakes(ctx);
  } else {
    cloud(ctx, 2, -2, 0.86, false);
    bolt(ctx);
  }
  ctx.restore();
}

function sun(ctx: SKRSContext2D, cx: number, cy: number, radius: number, ray: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (radius + 3), cy + Math.sin(angle) * (radius + 3));
    ctx.lineTo(cx + Math.cos(angle) * (radius + 3 + ray), cy + Math.sin(angle) * (radius + 3 + ray));
    ctx.stroke();
  }
}

function cloud(ctx: SKRSContext2D, ox: number, oy: number, scale: number, mask: boolean) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(12, 28);
  ctx.bezierCurveTo(4, 28, 3, 19, 10, 18);
  ctx.bezierCurveTo(10, 10, 18, 6, 25, 12);
  ctx.bezierCurveTo(28, 7, 40, 8, 42, 17);
  ctx.bezierCurveTo(48, 17, 49, 28, 41, 29);
  ctx.lineTo(12, 28);
  ctx.closePath();
  if (mask) {
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

function drops(ctx: SKRSContext2D, count: number, length: number, start: number) {
  const sets: Record<number, number[]> = {
    2: [16, 30],
    3: [14, 24, 34],
    4: [11, 19, 27, 35],
  };
  ctx.save();
  ctx.lineWidth = 2.75;
  for (const x of sets[count] ?? sets[3]) {
    ctx.beginPath();
    ctx.moveTo(x + 2, start);
    ctx.lineTo(x - 2, start + length);
    ctx.stroke();
  }
  ctx.restore();
}

function flakes(ctx: SKRSContext2D) {
  ctx.save();
  ctx.lineWidth = 2;
  flake(ctx, 24, 38, 7);
  ctx.restore();
}

function flake(ctx: SKRSContext2D, x: number, y: number, radius: number) {
  ctx.save();
  ctx.translate(x, y);
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cos * radius, sin * radius);
    ctx.stroke();
    const branch = radius * 0.58;
    const spread = 2.5;
    const px = Math.cos(angle + Math.PI / 2);
    const py = Math.sin(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(cos * branch - px * spread, sin * branch - py * spread);
    ctx.lineTo(cos * branch + px * spread, sin * branch + py * spread);
    ctx.stroke();
  }
  ctx.restore();
}

function bolt(ctx: SKRSContext2D) {
  ctx.beginPath();
  ctx.moveTo(27, 28);
  ctx.lineTo(18, 38);
  ctx.lineTo(24, 38);
  ctx.lineTo(20, 48);
  ctx.lineTo(33, 34);
  ctx.lineTo(26, 34);
  ctx.closePath();
  ctx.fill();
}

function fog(ctx: SKRSContext2D) {
  const bands = [
    [8, 12, 32],
    [6, 21, 36],
    [10, 30, 28],
    [7, 39, 30],
  ];
  for (const [x, y, width] of bands) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }
}
