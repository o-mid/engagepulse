import { createHmac } from "crypto";

/** Match Go ingest.Sign — hex HMAC-SHA256 of the exact raw body. */
export function signBody(secret: string, body: Buffer | string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export const KEY_ID_HEADER = "X-Key-Id";

export function signatureHeaders(
  secret: string,
  keyId: string,
  body: Buffer | string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Signature": signBody(secret, body),
  };
  if (keyId) headers[KEY_ID_HEADER] = keyId;
  return headers;
}

