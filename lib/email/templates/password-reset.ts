export function passwordResetTemplate(payload: {
  full_name?: string
  reset_url?: string
}): string {
  const name = payload.full_name || 'Builder'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrtai.com'
  const resetUrl = payload.reset_url || `${appUrl}/reset-password`

  return `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#05070D;font-family:-apple-system,sans-serif;color:#fff;">
  <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#05070D;padding:48px 20px;">
    <tr><td align="center">
      <table cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#0A0D14;border:1px solid rgba(79,124,255,0.15);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:40px 40px 20px 40px;text-align:center;">
          <div style="display:inline-block;width:64px;height:64px;background:rgba(79,124,255,0.1);border:1px solid rgba(79,124,255,0.3);border-radius:16px;margin-bottom:24px;line-height:64px;font-size:28px;">🔑</div>
          <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;">Reset your password</h1>
          <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);">Hi ${name}, click below to set a new password.</p>
        </td></tr>

        <tr><td style="padding:20px 40px 40px 40px;text-align:center;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#4F7CFF;color:#fff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;box-shadow:0 4px 20px rgba(79,124,255,0.3);">Reset Password →</a>
          <p style="margin:16px 0 0 0;font-size:12px;color:rgba(255,255,255,0.4);">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()
}