import crypto from 'crypto'

export function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashPin(pin: string, salt: string): string {
  // UPGRADE FOR SCALE: scrypt is memory-hard and GPU-resistant.
  // N: 16384, r: 8, p: 1 adds ~15-20ms of compute time per login.
  // Invisible to the user, but computationally destroys attackers trying to brute-force a leaked DB.
  const derivedKey = crypto.scryptSync(pin, salt, 64, { N: 16384, r: 8, p: 1 })
  return derivedKey.toString('hex')
}

const WEAK_PINS = new Set([
  '000000', '111111', '222222', '333333', '444444', '555555',
  '666666', '777777', '888888', '999999',
  '123456', '654321', '123123', '456789', '789456',
  '121212', '112233', '123321', '098765', '012345',
])

function isSequential(pin: string): boolean {
  let asc = true
  let desc = true
  for (let i = 1; i < pin.length; i++) {
    const a = Number(pin[i - 1])
    const b = Number(pin[i])
    if (b !== a + 1) asc = false
    if (b !== a - 1) desc = false
  }
  return asc || desc
}

export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) return { valid: false, error: 'PIN is required' }
  if (pin.length !== 6) return { valid: false, error: 'PIN must be exactly 6 digits' }
  if (!/^\d{6}$/.test(pin)) return { valid: false, error: 'PIN must contain only numbers' }
  if (/^(\d)\1{5}$/.test(pin)) return { valid: false, error: 'PIN cannot be all same digits' }
  if (WEAK_PINS.has(pin)) return { valid: false, error: 'PIN is too common' }
  if (isSequential(pin)) return { valid: false, error: 'PIN cannot be a sequence' }
  return { valid: true }
}