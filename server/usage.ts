import type { Database, Env } from './platform'
import { USAGE_CONSENT_VERSION } from '../src/legal/policy'
import { boundedBody, HttpError, response } from './security'
import { throttle } from './auth'
import { isModuleAvailable } from '../src/catalog/availability'
import { moduleBuildPending } from '../src/catalog/build-support'
import { USAGE_EVENTS, type UsageEvent, type UsageDay } from '../src/community/usage-contract'
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const columns: Record<UsageEvent, string> = { page_view:'page_views', configuration_started:'configurations', build_succeeded:'builds', firmware_download_requested:'downloads', configuration_exported:'exports' }
const day = (date: Date) => date.toISOString().slice(0,10)
const before = (now: Date, days: number) => day(new Date(now.getTime() - days * 86400000))
async function privateHash(key: string, purpose: string) {
  const secret = await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode('octamod-usage-v1:' + purpose))),b=>b.toString(16).padStart(2,'0')).join('')
}
/** No guest account, IP, user agent, referrer, module list or firmware enters these tables. */
export async function recordUsage(request: Request, env: Env, db: Database) {
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return new Response(null,{status:204})
  if(request.headers.get('X-Octamod-Usage-Consent')!==USAGE_CONSENT_VERSION)throw new HttpError(403,'Usage counts require your current opt-in choice.')
  const secret = env.ADMIN_KEY_SHA256?.trim().toLowerCase() ?? ''
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new HttpError(503,'Usage counts are not configured.')
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415,'Send JSON for this request.')
  let body: Record<string,unknown>
  try { const value: unknown = JSON.parse(new TextDecoder().decode(await boundedBody(request,512))); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); body=value as Record<string,unknown> }
  catch(error) { if(error instanceof HttpError)throw error; throw new HttpError(400,'Invalid usage event.') }
  if (Object.keys(body).sort().join(',') !== 'event,eventId,visitor' || typeof body.event !== 'string' || !USAGE_EVENTS.includes(body.event as UsageEvent) || typeof body.eventId !== 'string' || !uuid.test(body.eventId) || typeof body.visitor !== 'string' || !uuid.test(body.visitor)) throw new HttpError(400,'Invalid usage event.')
  const now = new Date(), today = day(now), event = body.event as UsageEvent
  // Purpose separation: backend-only key material never becomes a browser identifier or API response.
  const visitor = await privateHash(secret,today + ':visitor:' + body.visitor), identity = await privateHash(secret,today + ':event:' + body.visitor + ':' + body.eventId)
  await throttle(db,'usage:' + visitor,200,3600)
  const metric = columns[event] // Selected only from the closed enum above, never from arbitrary SQL input.
  await db.batch([
    db.prepare('INSERT INTO usage_events(day,event_hash) VALUES(?,?) ON CONFLICT DO NOTHING').bind(today,identity),
    db.prepare('INSERT INTO usage_visitors(day,visitor_hash) SELECT ?,? WHERE EXISTS(SELECT 1 FROM usage_events WHERE day=? AND event_hash=? AND counted=0) ON CONFLICT DO NOTHING').bind(today,visitor,today,identity),
    db.prepare(`INSERT INTO usage_daily(day,visitors,${metric}) SELECT ?,(SELECT COUNT(*) FROM usage_visitors WHERE day=? AND visitor_hash=? AND counted=0),1 WHERE EXISTS(SELECT 1 FROM usage_events WHERE day=? AND event_hash=? AND counted=0) ON CONFLICT(day) DO UPDATE SET visitors=visitors+excluded.visitors,${metric}=${metric}+excluded.${metric}`).bind(today,today,visitor,today,identity),
    db.prepare('UPDATE usage_visitors SET counted=1 WHERE day=? AND visitor_hash=?').bind(today,visitor),
    db.prepare('UPDATE usage_events SET counted=1 WHERE day=? AND event_hash=?').bind(today,identity),
    db.prepare("INSERT INTO usage_meta(key,value) VALUES('collection_started',?) ON CONFLICT DO NOTHING").bind(now.toISOString()),
  ])
  return response({ok:true})
}
/** Called hourly by the Worker and available to other backend adapters. */
export async function cleanupUsage(db: Database, now = new Date()) {
  await db.batch([
    db.prepare('DELETE FROM usage_events WHERE day<?').bind(before(now,1)),
    db.prepare('DELETE FROM module_download_events WHERE day<?').bind(before(now,1)),
    db.prepare('DELETE FROM usage_visitors WHERE day<?').bind(before(now,1)),
    db.prepare('DELETE FROM usage_daily WHERE day<?').bind(before(now,89)),
    db.prepare('DELETE FROM rate_limits WHERE expires<?').bind(Math.floor(now.getTime()/1000)),
  ])
}
/** Authorization is enforced by the enclosing /api/admin/ boundary. */
export async function usageStatistics(db: Database, days: number, now = new Date()) {
  if (![7,30,90].includes(days)) throw new HttpError(400,'Choose 7, 30 or 90 days.')
  const from = before(now,days-1), to = day(now)
  const collectionStarted = (await db.prepare("SELECT value FROM usage_meta WHERE key='collection_started'").first<{value:string}>())?.value ?? null
  const rows = (await db.prepare('SELECT day,visitors,page_views,configurations,builds,downloads,exports FROM usage_daily WHERE day>=? AND day<=? ORDER BY day').bind(from,to).all<UsageDay>()).results
  // Compare equal windows of completed days; today and the first partial collection day are excluded.
  const previousFrom = before(now,2 * (days-1)), previousTo = before(now,days)
  const unavailableReason = previousFrom < before(now,89) ? 'retention' : !collectionStarted || previousFrom <= collectionStarted.slice(0,10) ? 'collection' : null
  const previousRows = unavailableReason ? [] : (await db.prepare('SELECT day,visitors,page_views,configurations,builds,downloads,exports FROM usage_daily WHERE day>=? AND day<=? ORDER BY day').bind(previousFrom,previousTo).all<UsageDay>()).results
  return response({generatedAt:now.toISOString(),collectionStarted,from,to,days,rows,comparison:{from:previousFrom,to:previousTo,rows:previousRows,unavailableReason}})
}

/** Each request names one build-integrated module; no configuration grouping is stored. */
export async function recordModuleDownload(request: Request, env: Env, db: Database) {
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return new Response(null,{status:204})
  if(request.headers.get('X-Octamod-Usage-Consent')!==USAGE_CONSENT_VERSION)throw new HttpError(403,'Usage counts require your current opt-in choice.')
  const secret = env.ADMIN_KEY_SHA256?.trim().toLowerCase() ?? ''
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new HttpError(503,'Usage counts are not configured.')
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415,'Send JSON for this request.')
  let body: Record<string,unknown>
  try { const value: unknown = JSON.parse(new TextDecoder().decode(await boundedBody(request,512))); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); body=value as Record<string,unknown> }
  catch(error) { if(error instanceof HttpError)throw error; throw new HttpError(400,'Invalid module download event.') }
  if (Object.keys(body).sort().join(',') !== 'eventId,moduleId,visitor' || typeof body.moduleId !== 'string' || !isModuleAvailable(body.moduleId) || moduleBuildPending(body.moduleId) || typeof body.eventId !== 'string' || !uuid.test(body.eventId) || typeof body.visitor !== 'string' || !uuid.test(body.visitor)) throw new HttpError(400,'Invalid module download event.')
  const today = day(new Date())
  // Rate-limit digests are separate from deduplication. Neither table links a module to a visitor.
  const visitor = await privateHash(secret,today + ':module-rate:' + body.visitor), identity = await privateHash(secret,today + ':module-event:' + body.eventId)
  await throttle(db,'module-download:' + visitor,200,3600)
  await db.batch([
    db.prepare('INSERT INTO module_download_events(day,event_hash) VALUES(?,?) ON CONFLICT DO NOTHING').bind(today,identity),
    db.prepare('INSERT INTO module_downloads(module_id,downloads) SELECT ?,1 WHERE EXISTS(SELECT 1 FROM module_download_events WHERE day=? AND event_hash=? AND counted=0) ON CONFLICT(module_id) DO UPDATE SET downloads=downloads+1').bind(body.moduleId,today,identity),
    db.prepare('UPDATE module_download_events SET counted=1 WHERE day=? AND event_hash=?').bind(today,identity),
  ])
  return response({ok:true})
}
