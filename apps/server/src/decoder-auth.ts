import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export const DECODER_SESSION_COOKIE = "tribunal_decoder_session";
export const DECODER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_ID_BYTES = 32;
const MAX_DECODER_SESSIONS = 256;
const MIN_OPERATOR_TOKEN_BYTES = 32;

export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function hostnameFromHostHeader(host: string | undefined): string | undefined {
  if (!host) return undefined;
  try {
    return new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return undefined;
  }
}

function isLoopbackAddress(address: string | undefined): boolean {
  return Boolean(address && isLoopbackHost(address.replace(/^::ffff:/, "")));
}

export function decoderSessionTransportAllowed(input: {
  origin?: string | null;
  host?: string;
  remoteAddress?: string;
  encrypted?: boolean;
  trustProxy?: boolean;
  forwardedProto?: string;
}): boolean {
  if (input.encrypted) return true;
  const trustedProxyHttps = Boolean(
    input.trustProxy &&
    input.forwardedProto?.split(",", 1)[0]?.trim().toLowerCase() === "https",
  );
  if (trustedProxyHttps) {
    if (!input.origin) return true;
    try {
      return new URL(input.origin).protocol === "https:";
    } catch {
      return false;
    }
  }
  if (input.origin) {
    try {
      const parsedOrigin = new URL(input.origin);
      const target = hostnameFromHostHeader(input.host);
      return Boolean(
        parsedOrigin.protocol === "http:" &&
        isLoopbackHost(parsedOrigin.hostname.replace(/^\[|\]$/g, "")) &&
        target &&
        isLoopbackHost(target)
      );
    } catch {
      return false;
    }
  }
  // Plain browser HTTP is acceptable only for a loopback Origin and loopback
  // API target. Origin + Host lets a loopback-published Docker port work even
  // though its container peer is the bridge gateway. Without a browser Origin,
  // the socket peer must also be loopback. A localhost Origin alone cannot
  // bless a remote target.
  const target = hostnameFromHostHeader(input.host);
  return Boolean(target && isLoopbackHost(target) && isLoopbackAddress(input.remoteAddress));
}

export function assertDecoderNetworkPolicy(host: string, operatorToken?: string): void {
  if (operatorToken && Buffer.byteLength(operatorToken, "utf8") < MIN_OPERATOR_TOKEN_BYTES) {
    throw new Error(
      `TRIBUNAL_DECODER_OPERATOR_TOKEN must be at least ${MIN_OPERATOR_TOKEN_BYTES} bytes`,
    );
  }
  if (!isLoopbackHost(host) && !operatorToken) {
    throw new Error(
      "TRIBUNAL_DECODER_OPERATOR_TOKEN is required when HOST is not loopback",
    );
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function suppliedToken(headers: IncomingHttpHeaders): string | undefined {
  const authorization = firstHeader(headers.authorization)?.trim();
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  return firstHeader(headers["x-tribunal-operator-token"])?.trim();
}

function tokenDigest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function tokenMatches(supplied: string | undefined, expected: string): boolean {
  if (!supplied) return false;
  return timingSafeEqual(tokenDigest(supplied), tokenDigest(expected));
}

function sessionIdFromCookie(headers: IncomingHttpHeaders): string | undefined {
  const rawCookie = firstHeader(headers.cookie);
  if (!rawCookie) return undefined;
  const values: string[] = [];
  for (const part of rawCookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== DECODER_SESSION_COOKIE) continue;
    values.push(part.slice(separator + 1).trim());
  }
  // Reject duplicate cookies instead of letting proxy/browser ordering choose
  // which credential is authoritative. A 32-byte base64url id is 43 chars.
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(values[0])) return undefined;
  return values[0];
}

export interface DecoderSession {
  id: string;
  expiresAt: number;
}

interface DecoderSessionStoreOptions {
  ttlMs?: number;
  maxSessions?: number;
  now?: () => number;
  makeId?: () => string;
}

/**
 * Process-local decoder sessions. The configured operator token remains only
 * in process memory, while the session map retains SHA-256 digests rather than
 * raw cookie credentials. A process restart intentionally revokes every
 * browser session.
 */
export class DecoderSessionStore {
  private readonly sessions = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private readonly now: () => number;
  private readonly makeId: () => string;

  constructor(
    private readonly operatorToken?: string,
    options: DecoderSessionStoreOptions = {},
  ) {
    this.ttlMs = options.ttlMs ?? DECODER_SESSION_TTL_MS;
    this.maxSessions = options.maxSessions ?? MAX_DECODER_SESSIONS;
    this.now = options.now ?? Date.now;
    this.makeId = options.makeId ?? (() => randomBytes(SESSION_ID_BYTES).toString("base64url"));
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [digest, expiresAt] of this.sessions) {
      if (expiresAt <= now) this.sessions.delete(digest);
    }
  }

  private validSession(headers: IncomingHttpHeaders): boolean {
    const id = sessionIdFromCookie(headers);
    if (!id) return false;
    this.purgeExpired();
    const digest = tokenDigest(id).toString("hex");
    const expiresAt = this.sessions.get(digest);
    if (expiresAt == null || expiresAt <= this.now()) {
      this.sessions.delete(digest);
      return false;
    }
    return true;
  }

  authorized(headers: IncomingHttpHeaders): boolean {
    if (!this.operatorToken) return true;
    return tokenMatches(suppliedToken(headers), this.operatorToken) || this.validSession(headers);
  }

  unlock(headers: IncomingHttpHeaders): DecoderSession | null {
    if (!this.operatorToken || !tokenMatches(suppliedToken(headers), this.operatorToken)) {
      return null;
    }
    // Rotate a browser's prior session even when it is still valid.
    this.revoke(headers);
    this.purgeExpired();
    while (this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.keys().next().value as string | undefined;
      if (!oldest) break;
      this.sessions.delete(oldest);
    }
    const id = this.makeId();
    if (!/^[A-Za-z0-9_-]{43}$/.test(id)) {
      throw new Error("decoder session id generator returned an invalid id");
    }
    const expiresAt = this.now() + this.ttlMs;
    this.sessions.set(tokenDigest(id).toString("hex"), expiresAt);
    return { id, expiresAt };
  }

  revoke(headers: IncomingHttpHeaders): boolean {
    const id = sessionIdFromCookie(headers);
    return id ? this.sessions.delete(tokenDigest(id).toString("hex")) : false;
  }
}

function sessionCookieAttributes(secure: boolean): string {
  return `Path=/api/decoder; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

export function decoderSessionCookie(
  session: DecoderSession,
  secure: boolean,
  now = Date.now(),
): string {
  const maxAge = Math.max(0, Math.ceil((session.expiresAt - now) / 1000));
  return `${DECODER_SESSION_COOKIE}=${session.id}; ${sessionCookieAttributes(secure)}; Max-Age=${maxAge}`;
}

export function clearDecoderSessionCookie(secure: boolean): string {
  return `${DECODER_SESSION_COOKIE}=; ${sessionCookieAttributes(secure)}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function decoderOperatorAuthorized(
  headers: IncomingHttpHeaders,
  operatorToken?: string,
): boolean {
  if (!operatorToken) return true;
  return tokenMatches(suppliedToken(headers), operatorToken);
}
