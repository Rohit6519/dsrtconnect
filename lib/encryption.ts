import CryptoJS from 'crypto-js'

const SECRET = process.env.ENCRYPTION_SECRET || 'dsrt-default-change-me-in-production'

// Server-side symmetric encryption (for API tokens etc.)
export function encrypt(text: string): string {
  if (!text) return ''
  return CryptoJS.AES.encrypt(text, SECRET).toString()
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return ''
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
}

/**
 * Client-side E2E encryption utilities
 * These use the Web Crypto API for real security
 */

// Generate a new AES key for a document
export async function generateDocKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

// Encrypt content with a key
export async function encryptContent(
  content: string,
  keyBase64: string
): Promise<{ encrypted: string; iv: string }> {
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(content)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

// Decrypt content with a key
export async function decryptContent(
  encryptedBase64: string,
  ivBase64: string,
  keyBase64: string
): Promise<string> {
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['decrypt']
  )

  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}

// Get or create user's local encryption key
// Stored in localStorage — only user has it
export function getUserKey(userId: string): string {
  const stored = localStorage.getItem(`dsrt-key-${userId}`)
  if (stored) return stored

  // Generate new key
  const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  localStorage.setItem(`dsrt-key-${userId}`, key)
  return key
}

// Export key for backup/sharing between devices
export function exportUserKey(userId: string): string | null {
  return localStorage.getItem(`dsrt-key-${userId}`)
}

// Import key from another device
export function importUserKey(userId: string, key: string): void {
  localStorage.setItem(`dsrt-key-${userId}`, key)
}