import "server-only";

import net from "net";
import { HttpError } from "./http";

export function sendRaw(host: string, port: number, payload: Buffer) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    const socket = net.connect({ host, port });
    socket.setTimeout(8000);
    socket.once("timeout", () => {
      socket.destroy();
      finish(new HttpError(`The printer at ${host}:${port} did not respond.`));
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      finish(new HttpError(describePrinterError(host, port, error)));
    });
    socket.once("connect", () => {
      socket.end(payload);
    });
    socket.once("close", (hadError) => {
      if (!hadError) finish();
    });
  });
}

function describePrinterError(host: string, port: number, error: NodeJS.ErrnoException) {
  if (error.code === "ECONNREFUSED") return `Nothing is accepting prints at ${host}:${port}.`;
  if (error.code === "EHOSTUNREACH" || error.code === "ENETUNREACH" || error.code === "ENOTFOUND") {
    return `The printer at ${host} is not reachable from this computer.`;
  }
  if (error.code === "ETIMEDOUT" || error.code === "ECONNRESET") return `The printer at ${host}:${port} did not respond.`;
  return error.message || `Could not print to ${host}:${port}.`;
}
