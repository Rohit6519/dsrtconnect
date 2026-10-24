// ============================================================
// lib/encryption/open-mic.ts
// Web Crypto API (AES-256-GCM) Client-Side Encryption for Open Mic
// ============================================================

const ENCRYPTION_PREFIX = 'ENC::v1::'
const MASTER_SALT = 'dsrt_open_mic_secure_salt_2025'

// Derive a 256-bit AES-GCM CryptoKey for a specific channel
async function deriveChannelKey(channelId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(channelId + MASTER_SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(MASTER_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts plain text before sending to Supabase DB
 */
export async function encryptOpenMicText(plainText: string, channelId: string): Promise<string> {
  if (!plainText || typeof window === 'undefined') return plainText

  try {
    const key = await deriveChannelKey(channelId)
    const encoder = new TextEncoder()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plainText)
    )

    const ivBase64 = btoa(String.fromCharCode(...Array.from(iv)))
    const cipherBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(encryptedBuffer))))

    return `${ENCRYPTION_PREFIX}${ivBase64}::${cipherBase64}`
  } catch (e) {
    console.error('[OpenMic Encryption Error]:', e)
    return plainText // Fallback
  }
}

/**
 * Decrypts encrypted text received from Supabase DB
 */
export async function decryptOpenMicText(cipherText: string, channelId: string): Promise<string> {
  if (!cipherText || typeof window === 'undefined') return cipherText
  if (!cipherText.startsWith(ENCRYPTION_PREFIX)) return cipherText // Return legacy unencrypted messages as-is

  try {
    const parts = cipherText.slice(ENCRYPTION_PREFIX.length).split('::')
    if (parts.length !== 2) return cipherText

    const iv = new Uint8Array(atob(parts[0]).split('').map(c => c.charCodeAt(0)))
    const encryptedData = new Uint8Array(atob(parts[1]).split('').map(c => c.charCodeAt(0)))

    const key = await deriveChannelKey(channelId)

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (e) {
    console.warn('[OpenMic Decryption Error]: Could not decrypt message', e)
    return '🔒 [Encrypted Message]'
  }
}