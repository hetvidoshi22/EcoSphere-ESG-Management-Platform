// =============================================================
// EcoSphere — Mail transport (Nodemailer + Gmail SMTP)
// Reusable, generic sendEmail(). Credentials come from
// EMAIL_USER / EMAIL_PASS (a Gmail App Password).
//
// Design: email is a best-effort side-effect of business actions.
//   • If creds are missing, sending is skipped (no-op) — the app keeps
//     working, so local/dev without SMTP is fine.
//   • sendEmail NEVER throws — a mail failure must not break the
//     business action (approval, redemption, etc.) that triggered it.
// =============================================================
import nodemailer, { type Transporter } from 'nodemailer'

const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS

let cached: Transporter | null = null

/** Lazily build a Gmail SMTP transporter. Returns null when creds are absent. */
function getTransporter(): Transporter | null {
  if (!EMAIL_USER || !EMAIL_PASS) return null
  if (!cached) {
    cached = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
  }
  return cached
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

/**
 * Generic email sender used by every notification helper.
 * Returns true when an email was handed to the SMTP server, false when it
 * was skipped (no creds / no recipient) or failed. Never throws.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  if (!to) return false

  const transporter = getTransporter()
  if (!transporter) {
    console.warn(`[mail] EMAIL_USER/EMAIL_PASS not set — skipped "${subject}" to ${to}`)
    return false
  }

  try {
    await transporter.sendMail({
      from: `EcoSphere <${EMAIL_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`[mail] sent "${subject}" to ${to}`)
    return true
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}:`, err)
    return false
  }
}
