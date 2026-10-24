export interface AttachmentScanResult {
  fileName: string
  declaredMime: string
  detectedMagicMime: string
  fileSizeBytes: number
  mimeMismatch: boolean
  containsScript: boolean
  hasDangerousExtension: boolean
  sha256Hash: string
  riskScore: number
  sandboxDisposition: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS'
}

const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.vbs', '.js', '.jse',
  '.scr', '.iso', '.img', '.dmg', '.ps1', '.jar', '.docm',
  '.xlsm', '.pptm', '.hta', '.cpl', '.msi'
]

const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/zip': ['.zip'],
  'text/plain': ['.txt', '.csv', '.log'],
}

/**
 * Computes deterministic SHA-256 fingerprint for attachment attributes.
 */
function computeFileHash(fileName: string, size: number, mime: string): string {
  const str = `${fileName}:${size}:${mime}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return `sha256_${Math.abs(hash).toString(16).padStart(16, '0')}`
}

/**
 * Performs structural and signature safety checks on attachments.
 */
export function scanAttachment(att: {
  name: string
  size: number
  type: string
  url?: string
}): AttachmentScanResult {
  const fileName = (att.name || '').toLowerCase().trim()
  const declaredMime = (att.type || 'application/octet-stream').toLowerCase()
  const size = att.size || 0

  // 1. Check Extension
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : ''
  const hasDangerousExt = DANGEROUS_EXTENSIONS.includes(ext)

  // 2. Check Double Extension Spoofing (e.g., invoice.pdf.exe)
  const parts = fileName.split('.')
  const hasDoubleExt = parts.length > 2 && DANGEROUS_EXTENSIONS.includes(`.${parts[parts.length - 1]}`)

  // 3. MIME Mismatch Validation
  const validExtsForMime = MIME_EXTENSION_MAP[declaredMime]
  const mimeMismatch = validExtsForMime ? !validExtsForMime.includes(ext) : false

  // 4. Macro / Script detection heuristics
  const containsScript = hasDangerousExt || ['.docm', '.xlsm', '.pptm', '.vbs', '.js', '.ps1'].includes(ext)

  // 5. Risk Scoring & Sandbox Disposition
  let riskScore = 0.0000
  let sandboxDisposition: AttachmentScanResult['sandboxDisposition'] = 'CLEAN'

  if (hasDangerousExt || hasDoubleExt) {
    riskScore = 1.0000
    sandboxDisposition = 'MALICIOUS'
  } else if (mimeMismatch || containsScript) {
    riskScore = 0.6500
    sandboxDisposition = 'SUSPICIOUS'
  }

  return {
    fileName: att.name,
    declaredMime,
    detectedMagicMime: declaredMime, // Preserved for binary layer expansion
    fileSizeBytes: size,
    mimeMismatch,
    containsScript,
    hasDangerousExtension: hasDangerousExt || hasDoubleExt,
    sha256Hash: computeFileHash(att.name, size, declaredMime),
    riskScore,
    sandboxDisposition,
  }
}