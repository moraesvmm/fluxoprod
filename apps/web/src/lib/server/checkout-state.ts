import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getCheckoutSecret(): Buffer {
  const rawSecret =
    process.env.CHECKOUT_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!rawSecret) {
    throw new Error("Missing CHECKOUT_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createHash("sha256").update(rawSecret).digest();
}

export function encryptCheckoutSecret(value: string): string {
  if (!value) {
    throw new Error("Cannot encrypt an empty checkout secret.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getCheckoutSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptCheckoutSecret(payload: string): string {
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split(".");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted checkout payload.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getCheckoutSecret(),
    Buffer.from(ivBase64, "base64")
  );

  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function generateCheckoutReference() {
  return `checkout_${Date.now()}_${randomBytes(6).toString("hex")}`;
}

