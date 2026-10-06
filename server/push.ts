import { buildPushPayload } from '@block65/webcrypto-web-push'
import type { Database, Env, User } from './platform'
import { needMember, throttle } from './auth'
import { digest, HttpError, jsonBody, response } from './security'
import { ITEM_SQL, RECIPIENTS, toItem, VISIBLE } from './notifications'
import { notificationLines } from '../src/community/notification-text'
import type { DevicePush, DeviceSubscription, PushConfig, PushDevice, PushTopic } from '../src/community/push-contract'

export function pushConfig(env: Env) {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim(), privateKey = env.VAPID_PRIVATE_KEY?.trim()
  const subject = env.VAPID_SUBJECT?.trim() || env.APP_URL
  if (env.WEB_PUSH_ENABLED !== 'true' || !publicKey || !/^[A-Za-z0-9_-]{87}$/.test(publicKey) || !privateKey || !/^[A-Za-z0-9_-]{43}$/.test(privateKey) || !subject || !/^(https:\/\/|mailto:)/.test(subject)) return null
  return { publicKey, privateKey, subject }
}
function decode(value: unknown, bytes: number) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length !== Math.ceil(bytes * 4 / 3)) throw new HttpError(400, 'This device subscription is invalid.')
  try { const data = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0)); if (data.length === bytes) return data } catch { /* invalid encoding */ }
  throw new HttpError(400, 'This device subscription is invalid.')
}
/** Only known browser push services; never fetch arbitrary member-supplied URLs. */
export function pushEndpoint(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) throw new HttpError(400, 'This device subscription is invalid.')
  let url: URL
  try { url = new URL(value) } catch { throw new HttpError(400, 'This device subscription is invalid.') }
  const allowed = ['web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com'].includes(url.hostname) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.pathname === '/') throw new HttpError(400, 'This browser push service is not supported.')
  return url.href
}
async function subscriptionFrom(value: unknown): Promise<DeviceSubscription> {
  if (!value || typeof value !== 'object') throw new HttpError(400, 'This device subscription is invalid.')
  const input = value as Partial<DeviceSubscription>, endpoint = pushEndpoint(input.endpoint)
  const publicKey = decode(input.keys?.p256dh, 65); decode(input.keys?.auth, 16)
  try { await crypto.subtle.importKey('raw', publicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []) }
  catch { throw new HttpError(400, 'This device subscription is invalid.') }
  return { endpoint, keys: { p256dh: input.keys!.p256dh, auth: input.keys!.auth } }
}
function topicFrom(value: unknown): PushTopic {
  if (value !== 'activity' && value !== 'signups') throw new HttpError(400, 'Choose activity or sign-up alerts.')
  return value
}
type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; vapid_key: string; activity: number; signups: number }
const deviceFrom = (row: Pick<SubscriptionRow, 'activity' | 'signups'> | null): PushDevice => ({ activity: !!row?.activity, signups: !!row?.signups })

/** A verified administrator member account is required for signup subscriptions.
 * Key-only admin sessions do not leave permanent device grants behind. */
export async function pushRoutes(request: Request, env: Env, db: Database, user: User | null, admin: boolean): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (!path.startsWith('/api/push/')) return null
  const member = needMember(user), config = pushConfig(env)
  const role = await db.prepare('SELECT is_admin FROM users WHERE id=?').bind(member.id).first<{ is_admin: number }>()
  const signupAdmin = admin && role?.is_admin === 1
  if (path === '/api/push/config' && request.method === 'GET') return response({ available: !!config, publicKey: config?.publicKey ?? null, admin: signupAdmin } satisfies PushConfig)
  const match = path.match(/^\/api\/push\/subscriptions\/([a-f0-9]{64})$/)
  if (match && request.method === 'GET') {
    const row = await db.prepare('SELECT activity,signups,vapid_key FROM push_subscriptions WHERE id=? AND user_id=?').bind(match[1], member.id).first<SubscriptionRow>()
    return response(deviceFrom(row && (!config || row.vapid_key === config.publicKey) ? row : null))
  }
  if (path !== '/api/push/subscriptions' && path !== '/api/push/test') throw new HttpError(404, 'Push route not found.')
  if (!['POST', 'DELETE'].includes(request.method)) throw new HttpError(405, 'Choose a supported push action.')
  await throttle(db, 'push-device:' + member.id, 30)
  const body = await jsonBody(request), topic = topicFrom(body.topic)
  if (topic === 'signups' && !signupAdmin && request.method !== 'DELETE') throw new HttpError(403, 'Sign-up alerts require an administrator member account.')
  if (path === '/api/push/test') {
    if (request.method !== 'POST') throw new HttpError(405, 'Choose a supported push action.')
    if (!config) throw new HttpError(503, 'Push delivery is not connected yet.')
    await throttle(db, 'push-test:' + member.id, 5)
    const row = await db.prepare('SELECT * FROM push_subscriptions WHERE id=? AND user_id=?').bind(await digest(pushEndpoint(body.endpoint)), member.id).first<SubscriptionRow>()
    if (!row || !row[topic] || row.vapid_key !== config.publicKey) throw new HttpError(409, 'Enable notifications on this device first.')
    const result = await deliver(env, row, { title: 'Modwerk', body: topic === 'signups' ? 'Admin sign-up alerts are ready on this device.' : 'Community notifications are ready on this device.', href: topic === 'signups' ? '#admin' : '#account', tag: 'modwerk-push-test-' + topic }, 60)
    if (result === 404 || result === 410) await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(row.id).run()
    if (result < 200 || result >= 300) throw new HttpError(503, 'The test could not be delivered. Try enabling this device again.')
    return response({ ok: true })
  }
  if (request.method === 'DELETE') {
    const id = await digest(pushEndpoint(body.endpoint))
    await db.batch([
      db.prepare('UPDATE push_subscriptions SET ' + topic + '=0 WHERE id=? AND user_id=?').bind(id, member.id),
      db.prepare('DELETE FROM push_deliveries WHERE subscription_id=? AND EXISTS(SELECT 1 FROM push_subscriptions s WHERE s.id=subscription_id AND s.user_id=?) AND ' + (topic === 'activity' ? 'notification_id' : 'signup_id') + ' IS NOT NULL').bind(id, member.id),
      db.prepare('DELETE FROM push_subscriptions WHERE id=? AND user_id=? AND activity=0 AND signups=0').bind(id, member.id),
    ])
    const row = await db.prepare('SELECT activity,signups FROM push_subscriptions WHERE id=? AND user_id=?').bind(id, member.id).first<SubscriptionRow>()
    return response(deviceFrom(row))
  }
  if (!config) throw new HttpError(503, 'Push delivery is not connected yet.')
  const subscription = await subscriptionFrom(body.subscription), id = await digest(subscription.endpoint)
  const existing = await db.prepare('SELECT * FROM push_subscriptions WHERE id=?').bind(id).first<SubscriptionRow>()
  if (existing && existing.user_id !== member.id) throw new HttpError(409, 'This device is linked to another account. Turn off its notifications before switching accounts.')
  const count = await db.prepare('SELECT COUNT(*) AS count FROM push_subscriptions WHERE user_id=?').bind(member.id).first<{ count: number }>()
  if (!existing && (count?.count ?? 0) >= 10) throw new HttpError(409, 'This account already has ten notification devices.')
  await db.prepare('INSERT INTO push_subscriptions(id,user_id,endpoint,p256dh,auth,vapid_key,activity,signups) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,vapid_key=excluded.vapid_key,' + topic + '=1 WHERE push_subscriptions.user_id=excluded.user_id')
    .bind(id, member.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, config.publicKey, Number(topic === 'activity'), Number(topic === 'signups')).run()
  return response(deviceFrom(await db.prepare('SELECT activity,signups FROM push_subscriptions WHERE id=? AND user_id=?').bind(id, member.id).first<SubscriptionRow>()))
}

async function deliver(env: Env, row: SubscriptionRow, message: DevicePush, ttl: number) {
  const config = pushConfig(env)!
  try {
    const payload = await buildPushPayload({ data: message, options: { ttl, urgency: 'normal' } }, { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } }, config)
    // Workers supports manual redirects; the caller rejects every non-2xx status without following it.
    const result = await fetch(row.endpoint, { ...payload, redirect: 'manual', signal: AbortSignal.timeout(10000) })
    await result.body?.cancel()
    return result.status
  } catch { return 0 }
}
type Delivery = SubscriptionRow & { delivery_id: number; notification_id: string | null; signup_id: string | null; is_admin: number; email_verified: number; suspended: number; username: string | null }
/** Claims protect against overlapping fetch/cron invocations. Each event gets its own
 * tag and delivery; retries replace the same device notification. No signup batching. */
export async function dispatchPush(env: Env, db: Database, time = Math.floor(Date.now() / 1000)) {
  const config = pushConfig(env)
  if (!config) return { sent: 0 }
  const rows = (await db.prepare('SELECT s.*,d.id AS delivery_id,d.notification_id,d.signup_id,u.is_admin,u.email_verified,u.suspended,u.username FROM push_deliveries d JOIN push_subscriptions s ON s.id=d.subscription_id JOIN users u ON u.id=s.user_id WHERE d.retry_at<=? AND d.locked_until<=? ORDER BY d.id LIMIT 10').bind(time, time).all<Delivery>()).results
  let sent = 0
  for (const row of rows) {
    const claim = await db.prepare('UPDATE push_deliveries SET locked_until=?,attempts=attempts+1 WHERE id=? AND locked_until<=? AND retry_at<=? RETURNING attempts').bind(time + 120, row.delivery_id, time, time).first<{ attempts: number }>()
    if (!claim) continue
    if (row.vapid_key !== config.publicKey || !row.email_verified || row.suspended || !row.username) { await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(row.id).run(); continue }
    let message: DevicePush | null = null
    if (row.signup_id && row.signups && row.is_admin) {
      const signup = await db.prepare('SELECT username FROM signup_events WHERE user_id=?').bind(row.signup_id).first<{ username: string }>()
      if (signup) message = { title: 'New Modwerk sign-up', body: '@' + signup.username + ' created an account.', href: '#admin', tag: 'modwerk-signup-' + row.signup_id }
    } else if (row.notification_id && row.activity) {
      const item = await db.prepare(ITEM_SQL + ' WHERE n.id=? AND n.user_id IN (' + RECIPIENTS + ') AND n.seen=0 AND ' + VISIBLE).bind(row.notification_id, row.user_id, row.user_id).first<Parameters<typeof toItem>[0]>()
      if (item) {
        const line = notificationLines([toItem(item)])[0]
        // Opening device notifications returns to the authenticated site, including private issue activity.
        const href = line.href.startsWith('#') ? line.href : '#account/report/' + item.issue_id
        message = { title: 'Modwerk community', body: line.text, href, tag: 'modwerk-activity-' + row.notification_id }
      }
    }
    if (!message) { await db.prepare('DELETE FROM push_deliveries WHERE id=?').bind(row.delivery_id).run(); continue }
    const status = await deliver(env, row, message, row.signup_id ? 7 * 86400 : 86400)
    if (status === 404 || status === 410) await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(row.id).run()
    else if (status >= 200 && status < 300) { await db.prepare('DELETE FROM push_deliveries WHERE id=?').bind(row.delivery_id).run(); sent++ }
    else await db.prepare('UPDATE push_deliveries SET locked_until=0,retry_at=? WHERE id=?').bind(time + Math.min(3600, 60 * 2 ** Math.min(claim.attempts - 1, 6)), row.delivery_id).run()
  }
  return { sent }
}
export async function cleanupPush(db: Database) {
  await db.batch([
    db.prepare("DELETE FROM push_deliveries WHERE created_at<datetime('now','-7 days')"),
    db.prepare('DELETE FROM push_subscriptions WHERE user_id IN(SELECT id FROM users WHERE suspended=1 OR email_verified=0 OR username IS NULL)'),
  ])
}
/** Workers and Pages keep delivery alive after the response. A failed dispatcher
 * leaves the durable queue for the next minute and never fails the original action. */
export function startPush(env: Env, context: { waitUntil(promise: Promise<unknown>): void }) {
  if (env.DB && pushConfig(env)) context.waitUntil(dispatchPush(env, env.DB).catch(() => { console.warn('Push dispatch deferred; queued deliveries will retry.') }))
}
