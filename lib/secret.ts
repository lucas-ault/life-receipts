import "server-only";

import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";

let cached: string | null = null;

export function getSecret() {
  if (cached) return cached;
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) {
    cached = fromEnv;
    return cached;
  }
  const file = path.join(process.cwd(), "data", "session-secret");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const stored = fs.readFileSync(file, "utf8").trim();
    if (stored.length >= 16) {
      cached = stored;
      return cached;
    }
  }
  const created = randomBytes(32).toString("hex");
  fs.writeFileSync(file, created, { mode: 0o600 });
  cached = created;
  return cached;
}
