export interface IncomingMessageEnvelope {
  id: string
  threadId: string
  senderIdentityId: string
  actualUserId: string
  subject: string
  bodyHtml: string
  bodyText: string
  attachments: Array<{
    name: string
    size: number
    type: string
    url?: string
  }>
  sentAt: string
  sourceIp?: string
}

export interface FeatureExtractionResult {
  urlCount: number
  suspiciousUrlCount: number
  urls: string[]
  attachmentCount: number
  hasExecutable: boolean
  hasMacro: boolean
  htmlToTextRatio: number
  textEntropy: number
  ctaDensity: number
  headerAnomalies: string[]
}