import type { IncomingMessage } from "node:http";

const SAFE_API_READ_ROUTES = new Set([
  "/api/health",
  "/api/packs",
  "/api/capabilities",
]);

function csvValues(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function canonicalHost(value: string): string {
  if (!value || /[\s/@?#\\]/.test(value)) {
    throw new Error(`invalid allowed Host entry: ${JSON.stringify(value)}`);
  }
  let parsed: URL;
  try {
    parsed = new URL(`http://${value}`);
  } catch {
    throw new Error(`invalid allowed Host entry: ${JSON.stringify(value)}`);
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || !parsed.host) {
    throw new Error(`invalid allowed Host entry: ${JSON.stringify(value)}`);
  }
  return parsed.host.toLowerCase();
}

function canonicalOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`invalid allowed Origin entry: ${JSON.stringify(value)}`);
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.origin !== value ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`allowed Origin must be an exact http(s) origin: ${JSON.stringify(value)}`);
  }
  return parsed.origin;
}

export function buildAllowedHosts(port: number, configured?: string): ReadonlySet<string> {
  const defaults = [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`];
  return new Set([...defaults, ...csvValues(configured)].map(canonicalHost));
}

export function buildAllowedOrigins(port: number, ...configured: (string | undefined)[]): ReadonlySet<string> {
  const defaults = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://[::1]:${port}`,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
  ];
  return new Set(
    [...defaults, ...configured.flatMap(csvValues)].map(canonicalOrigin),
  );
}

/**
 * Reject missing, duplicate, malformed, or non-allowlisted Host headers before
 * routing. This prevents a DNS-rebinding name from becoming a trusted same-origin
 * API target merely because it resolves to loopback.
 */
export function requestHasAllowedHost(
  req: Pick<IncomingMessage, "rawHeaders" | "headers">,
  allowedHosts: ReadonlySet<string>,
): boolean {
  const rawValues: string[] = [];
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (req.rawHeaders[index]?.toLowerCase() === "host") {
      rawValues.push(req.rawHeaders[index + 1] ?? "");
    }
  }
  if (rawValues.length !== 1) return false;
  try {
    const value = canonicalHost(rawValues[0]);
    return value === rawValues[0].toLowerCase() && allowedHosts.has(value);
  } catch {
    return false;
  }
}

export function exactAllowedOrigin(
  rawOrigin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): string | null {
  if (!rawOrigin) return null;
  try {
    const origin = canonicalOrigin(rawOrigin);
    return allowedOrigins.has(origin) ? origin : null;
  } catch {
    return null;
  }
}

/** Route families that spend quota, mutate state, or expose case/ledger data. */
export function operatorAuthorizationRequired(method: string | undefined, path: string): boolean {
  if (method === "OPTIONS") return false;
  if (method === "GET" && SAFE_API_READ_ROUTES.has(path)) return false;
  if (path === "/api/decoder/session") return false;
  // Default-deny for every present or future API route not explicitly audited
  // as a safe read. Static application routes remain public.
  return path === "/api" || path.startsWith("/api/");
}
