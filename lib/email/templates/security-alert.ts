export function securityAlertTemplate(payload: {
  event_type?: string
  location?: string
  device?: string
  ip?: string
  timestamp?: string
  full_name?: string
}): string {
  const name = payload.full_name || 'Builder'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrtai.com'
  const eventLabel = (payload.event_type || 'Security Event').replace(/_/g, ' ').toLowerCase()

  return `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#05070D;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;">
  <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#05070D;padding:48px 20px;">
    <tr><td align="center">
      <table cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#0A0D14;border:1px solid rgba(239,68,68,0.15);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:40px 40px 20px 40px;text-align:center;">
          <div style="display:inline-block;width:64px;height:64px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:16px;margin-bottom:24px;line-height:64px;font-size:28px;">🚨</div>
          <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;letter-spacing:-0.3px;">Security Alert</h1>
          <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);">Hi ${name}, we detected a <strong>${eventLabel}</strong> on your account.</p>
        </td></tr>

        <tr><td style="padding:20px 40px;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;">
            ${payload.timestamp ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:rgba(255,255,255,0.5);">When</span><span style="color:#fff;font-weight:500;">${payload.timestamp}</span></div>` : ''}
            ${payload.location ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:rgba(255,255,255,0.5);">Location</span><span style="color:#fff;font-weight:500;">${payload.location}</span></div>` : ''}
            ${payload.device ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:rgba(255,255,255,0.5);">Device</span><span style="color:#fff;font-weight:500;">${payload.device}</span></div>` : ''}
          </div>
        </td></tr>

        <tr><td style="padding:20px 40px 40px 40px;text-align:center;">
          <a href="${appUrl}/settings/security" style="display:inline-block;padding:14px 32px;background:#EF4444;color:#fff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;">Review Security →</a>
          <p style="margin:16px 0 0 0;font-size:12px;color:rgba(255,255,255,0.4);">If this wasn't you, change your password immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()
}