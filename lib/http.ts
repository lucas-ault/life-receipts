export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export async function fetchTimeout(url: string | URL, init: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        accept: "application/json, application/xml, text/xml, */*",
        "user-agent": "life-receipts",
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new HttpError("The request could not be read.");
  }
}

export function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("The request could not be read.");
  }
  return value as Record<string, unknown>;
}
