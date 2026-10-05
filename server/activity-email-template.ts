import { escape } from './account-email-template'
import { SUPPORT_EMAIL } from '../src/support'
import { notificationLines } from '../src/community/notification-text'
import type { NotificationItem } from '../src/community/notification-contract'

/** Same scriptless, image-free shell as the account emails. User content is escaped and never linked directly. */
export function renderActivityEmail(items: NotificationItem[], urls: { app: string; notifications: string; settings: string; unsubscribe: string }, more = 0) {
  const app = new URL(urls.app)
  const lines = notificationLines(items, hash => { const url = new URL(app); url.hash = hash.replace(/^#/, ''); return url.href })
  const total = items.length + more
  const subject = (lines.length === 1 && !more ? lines[0].text : `${total} new ${total === 1 ? 'notification' : 'notifications'} on Modwerk`).replace(/[\r\n]+/g, ' ').slice(0, 150)
  const footer = `You receive activity email because it is on for your Modwerk account.`
  const text = [`What's new on Modwerk`, '', ...lines.flatMap(line => [line.text, ...(line.excerpt ? ['  ' + line.excerpt] : []), '  ' + line.href, '']), ...(more ? [`…and ${more} more in your notifications: ${urls.notifications}`, ''] : []),
    footer, `Choose what you receive: ${urls.settings}`, `Unsubscribe from activity email: ${urls.unsubscribe}`].join('\n')
  const rows = lines.map(line => `<tr><td style="padding:14px 0;border-top:1px solid #36363e;">
<a href="${escape(line.href)}" style="color:#f4f4f8;font-size:15px;line-height:23px;font-weight:bold;text-decoration:none;">${escape(line.text)}</a>
${line.excerpt ? `<p style="margin:6px 0 0;color:#a8a8b8;font-size:14px;line-height:22px;">${escape(line.excerpt)}</p>` : ''}
</td></tr>`).join('\n')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#171719;color:#ededf2;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escape(lines[0]?.text ?? subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171719"><tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-size:26px;font-weight:bold;letter-spacing:-1px;color:#ffffff;">Modwerk<span style="color:#c7a16c;"> ▪</span></td></tr>
<tr><td bgcolor="#c7a16c" height="3" style="height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td bgcolor="#232327" style="padding:28px 28px 20px;border:1px solid #36363e;border-top:0;border-radius:0 0 12px 12px;">
<p style="margin:0 0 16px;color:#c7a16c;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;">Community activity</p>
<h1 style="margin:0 0 18px;color:#f4f4f8;font-size:24px;line-height:32px;font-weight:bold;letter-spacing:-0.5px;">What's new on Modwerk</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows}
</table>
${more ? `<p style="margin:14px 0 0;color:#c4c4ce;font-size:14px;line-height:22px;">…and ${more} more. <a href="${escape(urls.notifications)}" style="color:#c4c9ff;text-decoration:underline;">Open your notifications</a></p>` : ''}
</td></tr>
<tr><td style="padding:24px 8px 8px;color:#90909e;font-size:12px;line-height:21px;">
<p style="margin:0 0 8px;">${footer} <a href="${escape(urls.settings)}" style="color:#b9bdd7;text-decoration:underline;">Choose what you receive</a> · <a href="${escape(urls.unsubscribe)}" style="color:#b9bdd7;text-decoration:underline;">Unsubscribe</a></p>
<p style="margin:0;">Need help? <a href="mailto:${escape(SUPPORT_EMAIL)}" style="color:#b9bdd7;text-decoration:underline;">Contact support</a></p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`
  return { subject, text, html }
}
