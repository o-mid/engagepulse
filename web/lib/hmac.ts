import { createHmac } from "crypto";

/** Match Go ingest.Sign — hex HMAC-SHA256 of the exact raw body. */
export function signBody(secret: string, body: Buffer | string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
