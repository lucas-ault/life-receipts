import "server-only";

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import type { BoardTicket } from "@/lib/tickets";
import { drawWeatherIcon } from "./icons";
import { qrMatrix } from "./qr";
import type { ReceiptDocument, WeatherBlock } from "./types";

const INK = "#16130f";

let fontsReady = false;

function ensureFonts() {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), "assets", "fonts");
  GlobalFonts.registerFromPath(path.join(dir, "Newsreader.ttf"), "Newsreader");
  GlobalFonts.registerFromPath(path.join(dir, "Newsreader-Italic.ttf"), "Newsreader Italic");
  GlobalFonts.registerFromPath(path.join(dir, "IBMPlexMono-Regular.ttf"), "Plex Mono");
  GlobalFonts.registerFromPath(path.join(dir, "IBMPlexMono-Medium.ttf"), "Plex Mono Medium");
  fontsReady = true;
}

type Align = "left" | "center" | "right";
type Op =
  | { kind: "text"; text: string; x: number; y: number; font: string; align: Align; tracking: number }
  | { kind: "rule"; x: number; y: number; w: number }
  | { kind: "icon"; code: number | null; x: number; y: number; size: number }
  | { kind: "dot"; x: number; y: number }
  | { kind: "check"; x: number; y: number; mark: "open" | "progress" }
  | { kind: "qr"; x: number; y: number; module: number; size: number; cells: boolean[] };

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

export function paperDots(paperWidth: string) {
  return paperWidth === "58" ? 384 : 576;
}

function wrap(ctx: Ctx, text: string, font: string, maxWidth: number) {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  const pushWord = (word: string) => {
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      return;
    }
    let chunk = "";
    for (const char of word) {
      const next = chunk + char;
      if (ctx.measureText(next).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  };
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) current = trial;
    else {
      if (current) lines.push(current);
      pushWord(word);
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function renderReceipt(document: ReceiptDocument, width: number) {
  ensureFonts();
  const measure = createCanvas(width, 8).getContext("2d");
  const wide = width >= 500;
  const pad = wide ? 36 : 22;
  const inner = width - pad * 2;
  const serif = (size: number, weight = 460) => `${weight} ${size}px Newsreader`;
  const italic = (size: number) => `italic ${size}px "Newsreader Italic"`;
  const mono = (size: number, medium = false) => `${size}px ${medium ? "Plex Mono Medium" : "Plex Mono"}`;
  const ops: Op[] = [];
  let y = pad + 4;

  const addText = (text: string, x: number, font: string, align: Align, tracking = 0) => {
    ops.push({ kind: "text", text, x, y, font, align, tracking });
  };
  const advance = (size: number, factor = 1.34) => {
    y += Math.round(size * factor);
  };
  const center = (text: string, font: string, size: number) => {
    for (const line of wrap(measure, text, font, inner)) {
      addText(line, width / 2, font, "center");
      advance(size);
    }
  };
  const paragraph = (text: string, font: string, size: number) => {
    for (const line of wrap(measure, text, font, inner)) {
      addText(line, pad, font, "left");
      advance(size);
    }
  };
  const label = (text: string) => {
    y += wide ? 22 : 16;
    addText(text.toUpperCase(), pad, mono(wide ? 12 : 11, true), "left", 2.1);
    advance(wide ? 12 : 11, 1.15);
    y += 7;
    ops.push({ kind: "rule", x: pad, y, w: inner });
    y += 14;
  };
  const forecastLine = (block: WeatherBlock) => {
    const bits: string[] = [];
    if (block.low != null) bits.push(`${block.low}°`);
    if (block.precipChance != null && block.precipChance >= 1) bits.push(`${Math.round(block.precipChance)}%`);
    return bits.join(" · ");
  };

  center("Roundup", italic(wide ? 48 : 38), wide ? 48 : 38);
  y += 2;
  center(document.dateLabel, serif(wide ? 18 : 16, 500), wide ? 18 : 16);
  y += 14;
  ops.push({ kind: "rule", x: pad, y, w: inner });
  y += 4;
  ops.push({ kind: "rule", x: pad, y, w: inner });
  y += 2;

  if (document.weather.length > 0) {
    label("Weather");
    const iconSize = wide ? 46 : 36;
    const nameSize = wide ? 22 : 18;
    const detailSize = wide ? 16 : 14;
    document.weather.forEach((block, index) => {
      if (index > 0) y += wide ? 8 : 6;
      if (block.unavailable) {
        paragraph(block.place, serif(nameSize, 600), nameSize);
        paragraph("Forecast unavailable", serif(detailSize), detailSize);
        return;
      }
      const rowTop = y;
      const textX = pad + iconSize + (wide ? 14 : 10);
      const textWidth = pad + inner - textX;
      ops.push({ kind: "icon", code: block.code, x: pad, y: rowTop + 1, size: iconSize });
      const high = block.high != null ? `${block.high}°${block.unit}` : "";
      measure.font = mono(wide ? 18 : 15, true);
      const highWidth = high ? measure.measureText(high).width + 14 : 0;
      const name = wrap(measure, block.place, serif(nameSize, 600), textWidth - highWidth)[0] || block.place;
      addText(name, textX, serif(nameSize, 600), "left");
      if (high) {
        y += 3;
        addText(high, pad + inner, mono(wide ? 18 : 15, true), "right");
        y -= 3;
      }
      advance(nameSize, 1.2);
      const meta = forecastLine(block);
      measure.font = mono(detailSize - 1);
      const metaWidth = meta ? measure.measureText(meta).width + 12 : 0;
      const conditionLines = wrap(measure, block.condition, serif(detailSize), Math.max(40, textWidth - metaWidth));
      addText(conditionLines[0] || "", textX, serif(detailSize), "left");
      if (meta) addText(meta, pad + inner, mono(detailSize - 1), "right");
      advance(detailSize, 1.25);
      for (const extra of conditionLines.slice(1)) {
        addText(extra, textX, serif(detailSize), "left");
        advance(detailSize, 1.25);
      }
      y = Math.max(y, rowTop + iconSize);
    });
  }

  if (document.eventsError || (document.events && document.events.length > 0)) {
    label(document.eventsLabel || "Today");
    if (document.eventsError) paragraph(document.eventsError, serif(wide ? 18 : 16), wide ? 18 : 16);
    const whenSize = wide ? 14 : 12;
    const titleSize = wide ? 20 : 17;
    for (const [index, event] of (document.events ?? []).entries()) {
      if (index > 0) y += wide ? 8 : 6;
      addText(event.when, pad, mono(whenSize, true), "left");
      advance(whenSize, 1.45);
      paragraph(event.title, serif(titleSize, 560), titleSize);
    }
  }

  if (document.headlines.length > 0) {
    label("Headlines");
    const titleSize = wide ? 18 : 16;
    const sourceSize = wide ? 12 : 11;
    const indent = wide ? 18 : 16;
    for (const group of document.headlines) {
      paragraph(group.place, serif(wide ? 20 : 17, 600), wide ? 20 : 17);
      y += 4;
      if (group.unavailable) paragraph("Headlines unavailable", serif(titleSize), titleSize);
      for (const item of group.items) {
        const lines = wrap(measure, item.title, serif(titleSize), inner - indent);
        lines.forEach((line, lineIndex) => {
          if (lineIndex === 0) ops.push({ kind: "dot", x: pad, y: y + Math.round(titleSize * 0.38) });
          addText(line, pad + indent, serif(titleSize), "left");
          advance(titleSize, 1.22);
        });
        if (item.source) {
          addText(item.source, pad + indent, mono(sourceSize), "left");
          advance(sourceSize, 1.2);
        }
        y += wide ? 9 : 7;
      }
      y += 4;
    }
  }

  if (document.notes.length > 0) {
    label("Notes");
    document.notes.forEach((note, index) => {
      if (index > 0) {
        ops.push({ kind: "rule", x: pad, y, w: Math.min(inner, wide ? 180 : 120) });
        y += 12;
      }
      if (note.author) {
        paragraph(note.author, serif(wide ? 18 : 16, 600), wide ? 18 : 16);
      }
      for (const part of note.body.split(/\n+/)) {
        const line = part.trim();
        if (line) paragraph(line, serif(wide ? 18 : 16), wide ? 18 : 16);
      }
      y += 8;
    });
  }

  if (document.todos.length > 0) {
    label("To-dos");
    const titleSize = wide ? 18 : 16;
    const dueSize = wide ? 13 : 12;
    const box = wide ? 16 : 14;
    for (const item of document.todos) {
      measure.font = mono(dueSize, true);
      const dueWidth = measure.measureText(item.dueLabel).width + 14;
      const textX = pad + box + 12;
      const lines = wrap(measure, item.title, serif(titleSize), Math.max(40, inner - (textX - pad) - dueWidth));
      const rowTop = y;
      ops.push({
        kind: "check",
        x: pad,
        y: rowTop + Math.max(0, Math.round((titleSize - box) / 2)),
        mark: item.status === "in_progress" ? "progress" : "open",
      });
      lines.forEach((line, lineIndex) => {
        addText(line, textX, serif(titleSize), "left");
        if (lineIndex === 0) addText(item.dueLabel, pad + inner, mono(dueSize, true), "right");
        advance(titleSize, 1.25);
      });
      y = Math.max(y, rowTop + box);
      y += 8;
    }
  }

  if (document.showWeatherCredit) {
    y += 8;
    ops.push({ kind: "rule", x: pad, y, w: inner });
    y += 14;
    center("Weather data by Open-Meteo", mono(wide ? 12 : 11), wide ? 12 : 11);
  }

  if (document.todos.length > 0 && document.todoUrl) {
    const matrix = qrMatrix(document.todoUrl);
    const quiet = 4;
    const target = Math.round(inner * (wide ? 0.46 : 0.62));
    const moduleSize = Math.max(4, Math.min(6, Math.floor(target / (matrix.size + quiet * 2))));
    const pixels = (matrix.size + quiet * 2) * moduleSize;
    y += wide ? 18 : 14;
    const origin = Math.round((width - pixels) / 2);
    ops.push({
      kind: "qr",
      x: origin + quiet * moduleSize,
      y: y + quiet * moduleSize,
      module: moduleSize,
      size: matrix.size,
      cells: matrix.cells,
    });
    y += pixels + 8;
    center("Scan to update to-dos", mono(wide ? 12 : 11), wide ? 12 : 11);
  }

  const height = Math.ceil(y + pad);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = INK;
  ctx.textBaseline = "top";
  for (const op of ops) {
    if (op.kind === "rule") {
      ctx.fillRect(op.x, op.y, op.w, 1);
      continue;
    }
    if (op.kind === "icon") {
      drawWeatherIcon(ctx, op.code, op.x, op.y, op.size);
      continue;
    }
    if (op.kind === "dot") {
      ctx.fillRect(op.x, op.y, wide ? 5 : 4, wide ? 5 : 4);
      continue;
    }
    if (op.kind === "check") {
      const size = wide ? 16 : 14;
      ctx.fillRect(op.x, op.y, size, 2);
      ctx.fillRect(op.x, op.y + size - 2, size, 2);
      ctx.fillRect(op.x, op.y, 2, size);
      ctx.fillRect(op.x + size - 2, op.y, 2, size);
      if (op.mark === "progress") ctx.fillRect(op.x + 3, op.y + 3, Math.floor((size - 6) / 2), size - 6);
      continue;
    }
    if (op.kind === "qr") {
      for (let row = 0; row < op.size; row += 1) {
        for (let column = 0; column < op.size; column += 1) {
          if (!op.cells[row * op.size + column]) continue;
          ctx.fillRect(op.x + column * op.module, op.y + row * op.module, op.module, op.module);
        }
      }
      continue;
    }
    ctx.font = op.font;
    const tracking = op.tracking;
    if (tracking > 0) {
      const measured = measureTracked(ctx, op.text, tracking);
      let cursor = op.align === "center" ? (width - measured) / 2 : op.x;
      for (const char of op.text) {
        ctx.fillText(char, cursor, op.y);
        cursor += ctx.measureText(char).width + tracking;
      }
      continue;
    }
    const textWidth = ctx.measureText(op.text).width;
    const x = op.align === "center" ? op.x - textWidth / 2 : op.align === "right" ? op.x - textWidth : op.x;
    ctx.fillText(op.text, x, op.y);
  }
  const image = ctx.getImageData(0, 0, width, height);
  return { png: canvas.toBuffer("image/png"), rgba: image.data, width, height };
}

export function renderTicket(ticket: BoardTicket, width: number) {
  ensureFonts();
  const wide = width >= 500;
  const pad = wide ? 36 : 22;
  const inner = width - pad * 2;
  const measure = createCanvas(width, 8).getContext("2d");
  const serif = (size: number) => `560 ${size}px Newsreader`;
  const italic = (size: number) => `italic ${size}px "Newsreader Italic"`;
  const mono = (size: number, medium = false) => `${size}px ${medium ? "Plex Mono Medium" : "Plex Mono"}`;
  const titleSize = wide ? 32 : 24;
  const descSize = wide ? 18 : 15;
  const dueSize = wide ? 15 : 13;
  const ops: Op[] = [];
  let y = pad + 2;

  const addText = (text: string, x: number, font: string, align: Align, tracking = 0, at = y) => {
    ops.push({ kind: "text", text, x, y: at, font, align, tracking });
  };
  const advance = (size: number, factor = 1.25) => {
    y += Math.round(size * factor);
  };

  addText(ticket.kicker.toUpperCase(), pad, mono(wide ? 12 : 11, true), "left", 2.2);
  advance(wide ? 12 : 11, 1.2);
  y += 8;
  ops.push({ kind: "rule", x: pad, y, w: inner });
  y += 16;

  const matrix = qrMatrix(ticket.url);
  const quiet = 4;
  const moduleSize = 4;
  const pixels = (matrix.size + quiet * 2) * moduleSize;
  const gap = wide ? 20 : 14;
  const textWidth = Math.max(96, inner - gap - pixels);
  const qrLeft = width - pad - pixels;
  const blockTop = y;
  let textY = blockTop;
  const pushLine = (line: string, font: string, size: number, factor: number) => {
    addText(line, pad, font, "left", 0, textY);
    textY += Math.round(size * factor);
  };
  for (const line of wrap(measure, ticket.title, serif(titleSize), textWidth)) {
    pushLine(line, serif(titleSize), titleSize, 1.16);
  }
  if (ticket.description) {
    textY += 6;
    for (const line of wrap(measure, ticket.description, italic(descSize), textWidth)) {
      pushLine(line, italic(descSize), descSize, 1.22);
    }
  }
  textY += 8;
  pushLine(ticket.due, mono(dueSize), dueSize, 1.3);

  const captionSize = wide ? 12 : 11;
  const captionFont = mono(captionSize);
  const qrBlock = pixels + 8 + captionSize;
  ops.push({
    kind: "qr",
    x: qrLeft + quiet * moduleSize,
    y: blockTop + quiet * moduleSize,
    module: moduleSize,
    size: matrix.size,
    cells: matrix.cells,
  });
  addText("Scan to update", qrLeft + pixels / 2, captionFont, "center", 0, blockTop + pixels + 8);
  y = blockTop + Math.max(textY - blockTop, qrBlock);

  const height = Math.ceil(y + pad);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = INK;
  ctx.textBaseline = "top";
  for (const op of ops) {
    if (op.kind === "rule") {
      ctx.fillRect(op.x, op.y, op.w, 1);
      continue;
    }
    if (op.kind === "qr") {
      for (let row = 0; row < op.size; row += 1) {
        for (let column = 0; column < op.size; column += 1) {
          if (!op.cells[row * op.size + column]) continue;
          ctx.fillRect(op.x + column * op.module, op.y + row * op.module, op.module, op.module);
        }
      }
      continue;
    }
    if (op.kind !== "text") continue;
    ctx.font = op.font;
    if (op.tracking > 0) {
      const measured = measureTracked(ctx, op.text, op.tracking);
      let cursor = op.align === "center" ? (width - measured) / 2 : op.x;
      for (const char of op.text) {
        ctx.fillText(char, cursor, op.y);
        cursor += ctx.measureText(char).width + op.tracking;
      }
      continue;
    }
    const textWidth = ctx.measureText(op.text).width;
    const x = op.align === "center" ? op.x - textWidth / 2 : op.align === "right" ? op.x - textWidth : op.x;
    ctx.fillText(op.text, x, op.y);
  }
  const image = ctx.getImageData(0, 0, width, height);
  return { png: canvas.toBuffer("image/png"), rgba: image.data, width, height };
}

function measureTracked(ctx: Ctx, text: string, tracking: number) {
  let width = 0;
  for (const char of text) width += ctx.measureText(char).width + tracking;
  return width - tracking;
}
