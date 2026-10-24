export function welcomeEmailTemplate(payload: {
  username?: string
  full_name?: string
  dsrt_email?: string
}): string {
  const name = payload.full_name || payload.username || 'Builder'
  const dsrtEmail = payload.dsrt_email || `${payload.username}@dsrtai.com`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrtai.com'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#05070D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;color:#ffffff;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#05070D;padding:48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:linear-gradient(180deg,#0A0D14 0%,#080B12 100%);border:1px solid rgba(79,124,255,0.15);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(79,124,255,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px 40px;text-align:center;background:radial-gradient(circle at top,rgba(79,124,255,0.12) 0%,transparent 70%);">
              <div style="display:inline-block;padding:12px 24px;background:rgba(79,124,255,0.1);border:1px solid rgba(79,124,255,0.3);border-radius:100px;margin-bottom:20px;">
                <span style="color:#4F7CFF;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">DSRT Connect</span>
              </div>
              <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
                Welcome to DSRT, ${name} 👋
              </h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.5;">
                Your builder identity is live. Let's create something great.
              </p>
            </td>
          </tr>

          <!-- DSRT Identity Card -->
          <tr>
            <td style="padding:20px 40px;">
              <div style="background:rgba(79,124,255,0.08);border:1px solid rgba(79,124,255,0.2);border-radius:16px;padding:24px;text-align:center;">
                <p style="margin:0 0 8px 0;font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.2px;font-weight:600;">
                  Your DSRT Identity
                </p>
                <p style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#4F7CFF;font-family:'SF Mono',Monaco,'Cascadia Mono',monospace;">
                  @${payload.username}
                </p>
                <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.6);font-family:'SF Mono',Monaco,'Cascadia Mono',monospace;">
                  ${dsrtEmail}
                </p>
              </div>
            </td>
          </tr>

          <!-- What's Next -->
          <tr>
            <td style="padding:20px 40px;">
              <h2 style="margin:0 0 20px 0;font-size:18px;font-weight:700;color:#ffffff;">
                What you can do now
              </h2>
              
              <div style="margin-bottom:16px;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                <div style="display:flex;align-items:start;gap:12px;">
                  <span style="font-size:22px;flex-shrink:0;">🚀</span>
                  <div>
                    <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#ffffff;">Start building</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.5;">Create projects, launch ventures, and share updates with the community.</p>
                  </div>
                </div>
              </div>

              <div style="margin-bottom:16px;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                <div style="display:flex;align-items:start;gap:12px;">
                  <span style="font-size:22px;flex-shrink:0;">🤝</span>
                  <div>
                    <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#ffffff;">Find your team</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.5;">Discover co-founders, collaborators, and mentors that match your vision.</p>
                  </div>
                </div>
              </div>

              <div style="padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                <div style="display:flex;align-items:start;gap:12px;">
                  <span style="font-size:22px;flex-shrink:0;">📬</span>
                  <div>
                    <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#ffffff;">Use your DSRT Mail</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.5;">Your internal <span style="color:#4F7CFF;font-family:monospace;">${dsrtEmail}</span> connects you to every collaborator on DSRT.</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:20px 40px 40px 40px;text-align:center;">
              <a href="${appUrl}/home" style="display:inline-block;padding:14px 32px;background:#4F7CFF;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(79,124,255,0.3);">
                Enter DSRT Connect →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:rgba(255,255,255,0.4);">
                Sent with care from the DSRT team
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">
                <a href="${appUrl}" style="color:rgba(255,255,255,0.4);text-decoration:none;">dsrtai.com</a>
                &nbsp;·&nbsp;
                <a href="${appUrl}/settings/notifications" style="color:rgba(255,255,255,0.4);text-decoration:none;">Notification preferences</a>
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