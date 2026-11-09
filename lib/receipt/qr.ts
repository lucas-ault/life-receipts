import QRCode from "qrcode";

export function qrMatrix(text: string) {
  const code = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = code.modules.size;
  const cells: boolean[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) cells.push(code.modules.get(row, column) === 1);
  }
  return { size, cells };
}
