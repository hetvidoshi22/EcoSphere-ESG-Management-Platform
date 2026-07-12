// =============================================================
// EcoSphere — HTML email templates
// One function per notification type; each returns { subject, html }.
// Templates share a branded, inline-styled layout (email clients need
// inline CSS). Brand palette matches the app: moss #4F7A5A, deep #33503C,
// cream #FAF9F5, ink #1F2937.
// =============================================================

const BRAND = '#4F7A5A'
const DEEP = '#33503C'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

interface Block {
  heading: string
  intro: string
  highlight?: { label: string; value: string }
  body?: string
  cta?: { label: string; url: string }
}

/** Escape user-supplied strings before embedding in HTML. */
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtDate(d: Date): string {
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function layout(preheader: string, block: Block): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF9F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2937;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
        <tr><td style="background:${DEEP};padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;">🌿 EcoSphere</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 10px;font-size:20px;color:#1F2937;">${block.heading}</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">${block.intro}</p>
          ${
            block.highlight
              ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:#eef3ef;border:1px solid #cdddd2;border-radius:12px;">
            <tr><td style="padding:16px 20px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${DEEP};font-weight:700;">${esc(block.highlight.label)}</div>
              <div style="font-size:22px;font-weight:700;color:#1F2937;margin-top:4px;">${esc(block.highlight.value)}</div>
            </td></tr>
          </table>`
              : ''
          }
          ${block.body ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">${block.body}</p>` : ''}
          ${
            block.cta
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0;">
            <tr><td style="border-radius:10px;background:${BRAND};">
              <a href="${block.cta.url}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(block.cta.label)}</a>
            </td></tr>
          </table>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #ececec;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you have an EcoSphere account. This is an automated ESG platform notification.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function welcomeTemplate(name: string) {
  return {
    subject: 'Welcome to EcoSphere 🌱',
    html: layout('Your EcoSphere account is ready', {
      heading: `Welcome aboard, ${esc(name)}!`,
      intro:
        'Your EcoSphere account is ready. Join CSR activities and challenges, earn XP and badges, and help move your department’s ESG score.',
      cta: { label: 'Sign in to EcoSphere', url: `${APP_URL}/sign-in` },
    }),
  }
}

export function badgeUnlockedTemplate(name: string, badgeName: string, badgeIcon: string) {
  return {
    subject: `Badge unlocked: ${badgeName} ${badgeIcon}`,
    html: layout(`You unlocked the ${badgeName} badge`, {
      heading: `${badgeIcon} Badge unlocked!`,
      intro: `Nice work, ${esc(name)} — you just earned a new badge.`,
      highlight: { label: 'New badge', value: `${badgeIcon} ${esc(badgeName)}` },
      cta: { label: 'View your badges', url: `${APP_URL}/badges` },
    }),
  }
}

export function csrApprovedTemplate(name: string, activityTitle: string, points: number) {
  return {
    subject: 'Your CSR participation was approved ✅',
    html: layout('Your CSR participation was approved', {
      heading: 'CSR participation approved',
      intro: `Hi ${esc(name)}, your submission for “${esc(activityTitle)}” has been approved.`,
      highlight: { label: 'Points earned', value: `+${points} pts` },
      cta: { label: 'View participation', url: `${APP_URL}/participation` },
    }),
  }
}

export function challengeApprovedTemplate(name: string, challengeTitle: string, xp: number) {
  return {
    subject: 'Your challenge proof was approved 🎉',
    html: layout('Your challenge was approved', {
      heading: 'Challenge approved',
      intro: `Hi ${esc(name)}, your proof for “${esc(challengeTitle)}” has been approved.`,
      highlight: { label: 'XP earned', value: `+${xp} XP` },
      cta: { label: 'View challenges', url: `${APP_URL}/challenges` },
    }),
  }
}

export function policyReminderTemplate(name: string, policyTitle: string) {
  return {
    subject: `Action needed: acknowledge “${policyTitle}”`,
    html: layout('Please acknowledge a policy', {
      heading: 'Policy acknowledgement reminder',
      intro: `Hi ${esc(name)}, please review and acknowledge the following policy at your earliest convenience.`,
      highlight: { label: 'Policy', value: esc(policyTitle) },
      cta: { label: 'Acknowledge now', url: `${APP_URL}/policies` },
    }),
  }
}

export function complianceAssignedTemplate(
  name: string,
  description: string,
  severity: string,
  dueDate: Date,
) {
  return {
    subject: `Compliance issue assigned to you (${severity})`,
    html: layout('A compliance issue was assigned to you', {
      heading: 'Compliance issue assigned',
      intro: `Hi ${esc(name)}, a compliance issue has been assigned to you as the owner.`,
      highlight: { label: `${esc(severity)} · due ${fmtDate(dueDate)}`, value: esc(description) },
      cta: { label: 'Open compliance issues', url: `${APP_URL}/compliance-issues` },
    }),
  }
}

export function rewardRedeemedTemplate(name: string, rewardName: string, pointsSpent: number) {
  return {
    subject: `Reward redeemed: ${rewardName} 🎁`,
    html: layout('Your reward redemption is confirmed', {
      heading: 'Reward redeemed',
      intro: `Hi ${esc(name)}, your redemption is confirmed and is being processed.`,
      highlight: { label: 'Redeemed', value: `${esc(rewardName)} · ${pointsSpent} pts` },
      cta: { label: 'Browse rewards', url: `${APP_URL}/rewards` },
    }),
  }
}
