import { SUPPORT_EMAIL } from '../src/support'

const BRAND = 'Modwerk'
export const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

/** Tables and inline styles work without scripts, remote fonts, images or tracking. */
export function renderAccountEmail(purpose: 'verify' | 'reset', link: string) {
  const parsed = new URL(link)
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Account links must use HTTP or HTTPS.')
  const action = purpose === 'verify' ? 'Verify your email address' : 'Reset your password'
  const expiry = purpose === 'verify' ? '24 hours' : '30 minutes'
  const explanation = purpose === 'verify'
    ? 'Confirm your email address to finish creating your Modwerk account. You will need the password you chose when registering.'
    : 'Choose a new password for your Modwerk account. Your other sessions will be signed out after the change.'
  const href = escape(parsed.href)
  const text = `${action} for ${BRAND}\n\n${parsed.href}\n\nThis link expires in ${expiry} and works once. ${purpose === 'verify' ? 'You will need the password you chose when registering. ' : ''}If you did not request this, ignore this message.\n\n${BRAND} will never ask you to send firmware.`
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${action} · ${BRAND}</title></head>
<body style="margin:0;padding:0;background-color:#171719;color:#ededf2;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${action} for Modwerk. Your one-use link expires in ${expiry}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171719"><tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-size:26px;font-weight:bold;letter-spacing:-1px;color:#ffffff;">Modwerk<span style="color:#c7a16c;"> ▪</span></td></tr>
<tr><td bgcolor="#c7a16c" height="3" style="height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td bgcolor="#232327" style="padding:32px 28px;border:1px solid #36363e;border-top:0;border-radius:0 0 12px 12px;">
<p style="margin:0 0 16px;color:#c7a16c;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;">Your Modwerk account</p>
<h1 style="margin:0 0 18px;color:#f4f4f8;font-size:28px;line-height:36px;font-weight:bold;letter-spacing:-0.5px;">${action}</h1>
<p style="margin:0 0 26px;color:#c4c4ce;font-size:15px;line-height:25px;">${explanation}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#727dde" style="border-radius:7px;text-align:center;">
<a href="${href}" style="display:inline-block;padding:15px 22px;border:1px solid #727dde;border-radius:7px;color:#ffffff;font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;">${action}</a>
</td></tr></table>
<p style="margin:18px 0 26px;color:#a8a8b8;font-size:12px;line-height:20px;">This link works once and expires in ${expiry}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #41414a;padding-top:22px;">
<p style="margin:0 0 12px;color:#a8a8b8;font-size:13px;line-height:22px;">If you did not request this, ignore this message. Your account will stay unchanged.</p>
<p style="margin:0;color:#a8a8b8;font-size:13px;line-height:22px;">Button not working? <a href="${href}" style="color:#c4c9ff;text-decoration:underline;">Open the ${purpose === 'verify' ? 'verification' : 'password reset'} link</a>.</p>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 8px 8px;color:#90909e;font-size:12px;line-height:21px;">
<p style="margin:0 0 8px;">Modwerk will never ask you to send firmware, passwords or recovery links.</p>
<p style="margin:0;">Need help? <a href="mailto:${escape(SUPPORT_EMAIL)}" style="color:#b9bdd7;text-decoration:underline;">Contact support</a></p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`
  return { subject: action + ' · ' + BRAND, text, html }
}
