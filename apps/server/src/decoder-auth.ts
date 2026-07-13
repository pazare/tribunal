import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function assertDecoderNetworkPolicy(host: string, operatorToken?: string): void {
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

export function decoderOperatorAuthorized(
  headers: IncomingHttpHeaders,
  operatorToken?: string,
): boolean {
  if (!operatorToken) return true;
  const supplied = suppliedToken(headers);
  if (!supplied) return false;
  return timingSafeEqual(tokenDigest(supplied), tokenDigest(operatorToken));
}
