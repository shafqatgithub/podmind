import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Dodo Payments webhook signature verification.
 *
 * Dodo signs webhooks using the Standard Webhooks spec (the same scheme
 * Svix uses, which is what their docs' "standardwebhooks" library
 * implements): three headers — `webhook-id`, `webhook-timestamp`,
 * `webhook-signature` — and an HMAC-SHA256 over `{id}.{timestamp}.{body}`,
 * base64-encoded, keyed by the webhook secret with its `whsec_` prefix
 * stripped and base64-decoded.
 *
 * Two details matter, same reasoning as Paddle's verifier:
 * 1. The signature covers the RAW body — a re-serialised JSON would not
 *    match unless it happens to be byte-identical.
 * 2. The comparison is timing-safe, and the timestamp is bounded, so a
 *    captured webhook cannot be replayed indefinitely.
 *
 * The signature header can carry multiple space-separated `v1,<sig>`
 * values (for secret rotation); any one matching is accepted.
 */

const MAX_AGE_SECONDS = 5 * 60;

export function verifyDodoSignature(
  rawBody: Buffer | string,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string,
  now: number = Date.now(),
): { valid: boolean; reason?: string } {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) {
    return { valid: false, reason: "missing webhook-id/timestamp/signature header" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { valid: false, reason: "malformed timestamp" };
  if (Math.abs(now / 1000 - ts) > MAX_AGE_SECONDS) {
    return { valid: false, reason: "signature timestamp outside the accepted window" };
  }

  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(rawSecret, "base64");

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expected, "utf8");

  for (const candidate of signature.split(" ")) {
    const sig = candidate.includes(",") ? candidate.split(",")[1] : candidate;
    if (!sig) continue;
    const sigBuf = Buffer.from(sig, "utf8");
    if (sigBuf.length !== expectedBuf.length) continue;
    if (timingSafeEqual(sigBuf, expectedBuf)) return { valid: true };
  }

  return { valid: false, reason: "signature mismatch" };
}
