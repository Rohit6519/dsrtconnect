import { adminClient } from '@/lib/supabase/admin'
import { sha256, hashWithSecret } from './hash'

export interface DeviceInfo {
  deviceName: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
}

export function parseUserAgent(ua: string): DeviceInfo {
  if (!ua) return { deviceName: 'Unknown Device', deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' }

  const isMobile = /Mobile|Android|iPhone/i.test(ua)
  const isTablet = /iPad|Tablet/i.test(ua)
  const deviceType: DeviceInfo['deviceType'] = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  let browser = 'Unknown'
  if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Edg/i.test(ua)) browser = 'Edge'
  else if (/Chrome/i.test(ua)) browser = 'Chrome'
  else if (/Safari/i.test(ua)) browser = 'Safari'

  let os = 'Unknown'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS'

  return {
    deviceName: `${browser} on ${os}`,
    deviceType,
    browser,
    os
  }
}

export class SessionTracker {
  static async track(params: {
    userId: string
    accessToken: string
    userAgent: string
    ip: string
  }) {
    try {
      const device = parseUserAgent(params.userAgent)
      const sessionHash = sha256(params.accessToken)
      const ipHash = hashWithSecret(params.ip)

      const { data, error } = await adminClient.rpc('track_session', {
        p_user_id: params.userId,
        p_session_hash: sessionHash,
        p_device_name: device.deviceName,
        p_device_type: device.deviceType,
        p_browser: device.browser,
        p_os: device.os,
        p_ip: params.ip,
        p_ip_hash: ipHash
      })

      if (error) {
        console.error('[SessionTracker]', error)
        return null
      }
      return data
    } catch (err) {
      console.error('[SessionTracker] exception', err)
      return null
    }
  }

  static async revokeAllExceptCurrent(userId: string, currentSessionHash: string) {
    return await adminClient
      .from('user_sessions')
      .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: 'USER_REVOKED_ALL' })
      .eq('user_id', userId)
      .neq('session_token_hash', currentSessionHash)
      .eq('is_active', true)
  }

  static async revokeSession(userId: string, sessionId: string) {
    return await adminClient
      .from('user_sessions')
      .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: 'USER_REVOKED' })
      .eq('user_id', userId)
      .eq('id', sessionId)
  }
}