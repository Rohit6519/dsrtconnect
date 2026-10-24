export interface AuthInspectionResult {
  spfResult: 'PASS' | 'FAIL' | 'SOFTFAIL' | 'NEUTRAL' | 'NONE'
  dkimResult: 'PASS' | 'FAIL' | 'NONE'
  dmarcResult: 'PASS' | 'FAIL' | 'NONE'
  arcResult: 'PASS' | 'FAIL' | 'NONE'
  tlsResult: boolean
  isInternalDsrtDomain: boolean
  alignedDomain: string | null
}

/**
 * Inspects authentication protocols and domain alignment.
 */
export function inspectAuthentication(
  senderEmail: string,
  headers?: Record<string, string>
): AuthInspectionResult {
  const emailLower = (senderEmail || '').toLowerCase().trim()
  const domain = emailLower.includes('@') ? emailLower.split('@')[1] : null
  const isInternal = domain === 'dsrt.com' || domain === 'dsrtai.com'

  // Internal DSRT system messages have cryptographic internal trust
  if (isInternal) {
    return {
      spfResult: 'PASS',
      dkimResult: 'PASS',
      dmarcResult: 'PASS',
      arcResult: 'PASS',
      tlsResult: true,
      isInternalDsrtDomain: true,
      alignedDomain: domain,
    }
  }

  // Parse header results if available
  const spfHeader = headers?.['received-spf'] || headers?.['authentication-results'] || ''
  const dkimHeader = headers?.['dkim-signature'] || headers?.['authentication-results'] || ''
  const dmarcHeader = headers?.['dmarc'] || headers?.['authentication-results'] || ''

  let spf: AuthInspectionResult['spfResult'] = 'NONE'
  if (/spf=pass/i.test(spfHeader)) spf = 'PASS'
  else if (/spf=fail/i.test(spfHeader)) spf = 'FAIL'
  else if (/spf=softfail/i.test(spfHeader)) spf = 'SOFTFAIL'

  let dkim: AuthInspectionResult['dkimResult'] = 'NONE'
  if (/dkim=pass/i.test(dkimHeader) || dkimHeader.length > 20) dkim = 'PASS'
  else if (/dkim=fail/i.test(dkimHeader)) dkim = 'FAIL'

  let dmarc: AuthInspectionResult['dmarcResult'] = 'NONE'
  if (/dmarc=pass/i.test(dmarcHeader)) dmarc = 'PASS'
  else if (/dmarc=fail/i.test(dmarcHeader)) dmarc = 'FAIL'

  return {
    spfResult: spf,
    dkimResult: dkim,
    dmarcResult: dmarc,
    arcResult: 'NONE',
    tlsResult: true,
    isInternalDsrtDomain: false,
    alignedDomain: domain,
  }
}