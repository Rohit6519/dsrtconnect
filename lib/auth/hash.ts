import crypto from 'crypto'

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function hashWithSecret(value: string): string {
  const secret = process.env.ENCRYPTION_SECRET || process.env.CRON_SECRET || 'fallback-dsrt-build-secret-key'
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

export function generateSecureOtp6(): string {
  const n = crypto.randomInt(0, 1_000_000)
  return n.toString().padStart(6, '0')
}

export function hashOtp(otp: string): string {
  return sha256(otp)
}