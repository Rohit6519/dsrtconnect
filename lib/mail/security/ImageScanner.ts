export interface ImageScanResult {
  hasQrCode: boolean
  qrCodeUrl: string | null
  imageToTextRatioScore: number
  isEmbeddedImageOnly: boolean
}

/**
 * Evaluates image balance and extracts QR/OCR markers safely.
 */
export function scanMessageImages(
  bodyHtml: string,
  bodyText: string
): ImageScanResult {
  const html = bodyHtml || ''
  const text = (bodyText || '').trim()

  // Detect image tags
  const imgTagMatches = html.match(/<img[^>]+src=["']([^"']+)["']/gi) || []
  const imageCount = imgTagMatches.length

  // Check if message contains images but virtually zero body text
  const isImageOnly = imageCount > 0 && text.length < 30

  // Inspect image URLs for QR code indicators or embedded link proxies
  let qrUrl: string | null = null;
  for (const match of imgTagMatches) {
    if (/qr[_-]?code|chart\.googleapis\.com|qr-server/i.test(match)) {
      const srcMatch = match.match(/src=["']([^"']+)["']/i)
      if (srcMatch && srcMatch[1]) {
        qrUrl = srcMatch[1]
        break
      }
    }
  }

  const ratioScore = isImageOnly ? 0.75 : imageCount > 3 ? 0.35 : 0.0

  return {
    hasQrCode: Boolean(qrUrl),
    qrCodeUrl: qrUrl,
    imageToTextRatioScore: ratioScore,
    isEmbeddedImageOnly: isImageOnly,
  }
}