const STRIP_ROWS = 256;

export function packMono(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  if (width % 8 !== 0) throw new Error("Receipt width must be a multiple of 8 dots.");
  const widthBytes = width / 8;
  const out = Buffer.alloc(widthBytes * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const lum = rgba[index] * 0.299 + rgba[index + 1] * 0.587 + rgba[index + 2] * 0.114;
      if (lum < 200) out[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return out;
}

function rasterHeader(widthBytes: number, rows: number) {
  return Buffer.from([
    0x1d,
    0x76,
    0x30,
    0x00,
    widthBytes & 0xff,
    (widthBytes >> 8) & 0xff,
    rows & 0xff,
    (rows >> 8) & 0xff,
  ]);
}

export function rgbaToEscPos(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  const packed = packMono(rgba, width, height);
  const widthBytes = width / 8;
  const parts: Buffer[] = [Buffer.from([0x1b, 0x40])];
  for (let y = 0; y < height; y += STRIP_ROWS) {
    const rows = Math.min(STRIP_ROWS, height - y);
    parts.push(rasterHeader(widthBytes, rows), packed.subarray(y * widthBytes, (y + rows) * widthBytes));
  }
  parts.push(Buffer.from([0x1b, 0x64, 0x04, 0x1d, 0x56, 0x01]));
  return Buffer.concat(parts);
}
