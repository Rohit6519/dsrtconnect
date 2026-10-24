import { Resend } from 'resend'

export class EmailService {
  static async sendVerificationOtp(to: string, otp: string): Promise<{ ok: boolean; error?: string }> {
    const key = process.env.RESEND_API_KEY
    if (!key) return { ok: false, error: 'RESEND_API_KEY_MISSING' }

    const resend = new Resend(key)
    const fromEmail = process.env.EMAIL_FROM || 'verify@dsrtai.com'
    const fromName = process.env.EMAIL_FROM_NAME || 'DSRT Security'

    try {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: `${otp} is your DSRT verification code`,
        html: `<div style="background:#05070D;color:#fff;padding:40px;font-family:sans-serif;text-align:center;border-radius:16px;">
                <h1 style="color:#4F7CFF;">DSRT Connect</h1>
                <p style="font-size:16px;color:#aaa;">Your verification code is:</p>
                <div style="font-size:40px;font-weight:bold;letter-spacing:10px;margin:20px 0;">${otp}</div>
                <p style="font-size:12px;color:#555;">This code expires in 10 minutes.</p>
               </div>`
      })

      if (error) {
        console.error('[Resend Error Details]:', JSON.stringify(error, null, 2))
        return { ok: false, error: error.message }
      }

      console.log(`[Email Delivered]: to ${to}, id: ${data?.id}`)
      return { ok: true }
    } catch (err: any) {
      console.error('[Resend Exception]:', err)
      return { ok: false, error: err.message }
    }
  }
}