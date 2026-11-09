import os from "os";

const PRIVATE_ADDRESS = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return null;
  if (value === "/login" || value.startsWith("/login?") || value === "/setup" || value.startsWith("/setup?")) return null;
  return value;
}

export function phoneOrigin(envUrl: string | undefined, addresses: string[]) {
  const configured = (envUrl ?? "").trim().replace(/\/$/, "");
  let port = "3000";
  if (configured) {
    try {
      const url = new URL(configured);
      const host = url.hostname;
      const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
      if (!loopback) return configured;
      port = url.port || port;
    } catch {
      port = "3000";
    }
  }
  const lan = addresses.find((address) => PRIVATE_ADDRESS.test(address));
  if (lan) return `http://${lan}:${port}`;
  return configured || `http://localhost:${port}`;
}

export function lanAddresses() {
  const addresses: string[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = entry.family as string | number;
      if ((family === "IPv4" || family === 4) && !entry.internal) addresses.push(entry.address);
    }
  }
  return addresses;
}

export function householdOrigin() {
  return phoneOrigin(process.env.APP_URL, lanAddresses());
}

export function householdTodoUrl() {
  return `${householdOrigin()}/todos`;
}
