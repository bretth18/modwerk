import type { Env } from './platform'
import { HttpError } from './security'

export function mailAvailable(env: Env) { return !!env.RESEND_API_KEY?.trim() && !!env.MAIL_FROM?.trim() }
/** Only account verification messages; no mailing-list enrollment or campaign side effects. */
export async function sendCode(env: Env, email: string, code: string, id: string, deleting: boolean) {
  if (!mailAvailable(env)) throw new HttpError(503, 'Email verification is not configured yet. Please try again later.')
  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': id },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [email], subject: deleting ? 'Confirm deletion of your Octamod account' : 'Your Octamod verification code',
        text: (deleting ? 'To permanently delete your Octamod account, enter this code on Octamod: ' : 'To verify your email and sign in to Octamod, enter this code: ') + code + '\n\nIt expires in 10 minutes and works once. If you did not request it, ignore this email. Never share the code. Open Octamod at ' + env.APP_URL }),
    })
    if (!result.ok) throw new Error('Delivery failed')
  } catch { throw new HttpError(503, 'The verification email could not be sent. Please try again later.') }
}
