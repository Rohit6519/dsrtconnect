import crypto from "crypto";

// AES-256-GCM encryption
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get the encryption key from environment
 */
function getKey(): Buffer {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY is not set in environment variables",
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY must be at least 32 characters long",
    );
  }

  // Derive a 32-byte key from the secret using scrypt
  return crypto.scryptSync(secret, "dsrt-salt-v1", KEY_LENGTH);
}

/**
 * Encrypt a message
 * Returns: base64(salt + iv + tag + encrypted)
 */
export function encryptMessage(text: string): string {
  if (!text || typeof text !== "string") return text;

  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + encrypted
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    // Return base64 with prefix for identification
    return "enc_v1:" + combined.toString("base64");
  } catch (error) {
    console.error("Encryption failed:", error);
    return text; // Fallback: return plain text
  }
}

/**
 * Decrypt a message
 * Handles both encrypted and plain text (backwards compatible)
 */
export function decryptMessage(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string") {
    return encryptedText;
  }

  // Check if message is encrypted (has our prefix)
  if (!encryptedText.startsWith("enc_v1:")) {
    return encryptedText; // Plain text (old messages)
  }

  try {
    const key = getKey();
    const base64 = encryptedText.substring(7); // Remove "enc_v1:" prefix
    const combined = Buffer.from(base64, "base64");

    // Extract parts
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    return "🔒 [Encrypted message]"; // Show placeholder on decrypt failure
  }
}

/**
 * Check if a message is encrypted
 */
export function isEncrypted(text: string): boolean {
  return typeof text === "string" && text.startsWith("enc_v1:");
}

/**
 * Encrypt multiple messages
 */
export function encryptMessages(messages: any[]): any[] {
  return messages.map((msg) => ({
    ...msg,
    content: msg.content ? encryptMessage(msg.content) : msg.content,
  }));
}

/**
 * Decrypt multiple messages
 */
export function decryptMessages(messages: any[]): any[] {
  return messages.map((msg) => ({
    ...msg,
    content: msg.content ? decryptMessage(msg.content) : msg.content,
  }));
}
