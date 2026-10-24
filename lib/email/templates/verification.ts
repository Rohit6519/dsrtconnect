export function verificationEmailTemplate(payload: {
  full_name?: string
  verification_url?: string
  reason?: string
}): string {
  const name = payload.full_name || 'Builder'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrtai.com'
  const verifyUrl = payload.verification_url || `${appUrl}/settings/security`

  return `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#05070D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#05070D;padding:48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#0A0D14;border:1px solid rgba(79,124,255,0.15);border-radius:20px;overflow:hidden;">
          
          <tr>
            <td style="padding:40px 40px 20px 40px;text-align:center;">
              <div style="display:inline-block;width:64px;height:64px;background:rgba(79,124,255,0.1);border:1px solid rgba(79,124,255,0.3);border-radius:16px;margin-bottom:24px;line-height:64px;text-align:center;font-size:28px;">🛡️</div>
              <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
                Verify your email, ${name}
              </h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.6;">
                Your DSRT activity looks great. Verifying your email unlocks stronger visibility signals and trust across the platform.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;text-align:center;">
              <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:#4F7CFF;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;box-shadow:0 4px 20px rgba(79,124,255,0.3);">
                Verify Email →
              </a>
              <p style="margin:16px 0 0 0;font-size:12px;color:rgba(255,255,255,0.4);">
                This is a one-tap upgrade. No forms.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 40px 40px;">
              <div style="padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                <p style="margin:0 0 8px 0;font-size:12px;color:rgba(79,124,255,0.9);font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                  Why verify?
                </p>
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;">
                  Verified builders appear more credibly to collaborators, opportunity posters, and investors on DSRT. It's optional but recommended.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">
                Not you? <a href="${appUrl}/settings/security" style="color:rgba(79,124,255,0.7);">Review your security settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}