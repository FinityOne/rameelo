import crypto from "crypto";

// ── Payout account encryption (server-only) ───────────────────────────────────
// Full bank account numbers are encrypted at rest with AES-256-GCM. The key lives
// ONLY in the server env (PAYOUT_ENC_KEY) — never in the DB or the client — so a
// database leak alone can't expose account numbers. Decryption happens only in
// trusted server routes (admin reveal). PAYOUT_ENC_KEY can be any strong string;
// it's run through SHA-256 to derive the 32-byte key.

export const payoutCryptoConfigured = (): boolean => !!process.env.PAYOUT_ENC_KEY;

function getKey(): Buffer {
  const secret = process.env.PAYOUT_ENC_KEY;
  if (!secret) throw new Error("PAYOUT_ENC_KEY is not set — cannot encrypt/decrypt payout details.");
  return crypto.createHash("sha256").update(secret, "utf8").digest(); // 32 bytes
}

// Returns "ivB64:tagB64:ciphertextB64".
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(blob: string): string {
  const [ivB, tagB, ctB] = (blob ?? "").split(":");
  if (!ivB || !tagB || !ctB) throw new Error("Malformed encrypted value.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
}
