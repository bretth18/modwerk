import type { Env, Database } from './platform'
import { digest, HttpError } from './security'
import { throttle } from './auth'

export function emailReady(env: Env) { return !!env.RESEND_API_KEY && !!env.EMAIL_FROM && !/[\r\n]/.test(env.EMAIL_FROM) }
export async function sendAccountEmail(env: Env, db: Database, to: string, purpose: 'verify' | 'reset', value: string) {
  if (!emailReady(env)) throw new HttpError(503, 'Account email is not connected yet. Please try again later.')
  // Leave headroom in the free plan for delivery retries and operational mail.
  await throttle(db, 'account-mail:daily', 80, 86400)
  await throttle(db, 'account-mail:monthly', 2400, 30 * 86400)
  const url = new URL(env.APP_URL!)
  url.hash = 'account/' + purpose + '/' + value
  const action = purpose === 'verify' ? 'Verify your email address' : 'Reset your password'
  const text = `${action} for Octamod\n\n${url.href}\n\nThis link expires in ${purpose === 'verify' ? '24 hours' : '30 minutes'} and works once. ${purpose === 'verify' ? 'You will need the password you chose when registering. ' : ''}If you did not request this, ignore this message.\n\nOctamod will never ask you to send firmware.`
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': purpose + '-' + await digest(value) },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: action + ' · Octamod', text }),
  }).catch(() => null)
  // Never expose provider bodies, recipient addresses, API credentials or links in logs/errors.
  if (!result?.ok) throw new HttpError(503, 'The email could not be sent. Please try again later.')
}
