import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function key() {
  const secret = process.env.OUTPOST_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("OUTPOST_ENCRYPTION_KEY or BETTER_AUTH_SECRET must be set");
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM, output is `enc:v1:<iv>.<tag>.<ciphertext>` in base64url. */
export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  if (!value.startsWith(PREFIX)) return value;
  const [iv, tag, ciphertext] = value
    .slice(PREFIX.length)
    .split(".")
    .map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
