import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paddle webhook signature verification.
 *
 * Paddle signs each webhook with a header shaped `ts=<unix>;h1=<hmac>`, where
 * the HMAC is SHA-256 over `<ts>:<raw body>` keyed with the endpoint's secret.
 *
 * Two details matter and are easy to get wrong:
 *
 * 1. The signature covers the RAW body. Verifying against a re-serialised
 *    JSON.stringify of the parsed object will fail for any payload whose key
 *    order or number formatting differs by a single byte, so the controller
 *    keeps the raw buffer.
 *
 * 2. The comparison is timing-safe. A plain === leaks how many leading bytes
 *    were correct, which is enough to forge a signature given enough attempts.
 *
 * The timestamp is checked too: without it, a valid webhook captured once
 * could be replayed forever.
 */

const MAX_AGE_SECONDS = 5 * 60;

export interface SignatureParts {
  timestamp: number;
  hash: string;
}

export function parsePaddleSignature(header: string | undefined): SignatureParts | null {
  if (!header) return null;

  let timestamp: number | null = null;
  let hash: string | null = null;

  for (const part of header.split(";")) {
    const [key, value] = part.split("=");
    if (key === "ts" && value) timestamp = Number(value);
    if (key === "h1" && value) hash = value;
  }

  if (timestamp === null || !Number.isFinite(timestamp) || !hash) return null;
  return { timestamp, hash };
}

export function verifyPaddleSignature(
  rawBody: Buffer | string,
  header: string | undefined,
  secret: string,
  now: number = Date.now(),
): { valid: boolean; reason?: string } {
  const parts = parsePaddleSignature(header);
  if (!parts) return { valid: false, reason: "malformed signature header" };

  const ageSeconds = Math.abs(now / 1000 - parts.timestamp);
  if (ageSeconds > MAX_AGE_SECONDS) {
    return { valid: false, reason: "signature timestamp outside the accepted window" };
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const expected = createHmac("sha256", secret)
    .update(`${parts.timestamp}:${body}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parts.hash, "utf8");
  if (a.length !== b.length) return { valid: false, reason: "signature mismatch" };
  if (!timingSafeEqual(a, b)) return { valid: false, reason: "signature mismatch" };

  return { valid: true };
}
