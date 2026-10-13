import type { Database, User } from './platform'
import { needMember, throttle } from './auth'
import { boundedBody, HttpError, response } from './security'
import { MODULES } from '../src/catalog/modules'
import { DIAGNOSTIC_CONSENT_DAYS, DIAGNOSTIC_BUILD_ERRORS, DIAGNOSTIC_BUILD_KINDS, DIAGNOSTIC_BUILD_PHASES, DIAGNOSTIC_ERRORS, DIAGNOSTIC_EVENTS, DIAGNOSTIC_PHASES, DIAGNOSTIC_RESULTS, DIAGNOSTIC_RETENTION_DAYS, DIAGNOSTIC_USB_ERRORS, DIAGNOSTIC_USB_PHASES, OCTATRACK_DIAGNOSTICS_VERSION, type DiagnosticConsent, type OctatrackDiagnostic } from '../src/community/octatrack-diagnostics-contract'

const since = (now: Date, days: number) => new Date(now.getTime() - days * 86400000).toISOString()
const hash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const uint = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xffffffff
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const fields = (v: Record<string, unknown>, names: string[]) => Object.keys(v).every(key => names.includes(key))
async function bodyOf(request: Request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415, 'Send JSON.')
  try { return JSON.parse(new TextDecoder().decode(await boundedBody(request, 8192))) as unknown }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid diagnostics.') }
}
export function validateDiagnostic(value: unknown): OctatrackDiagnostic {
  const readingKeys = ['state','failed','modules','dsp','intact','ran','cpu','tracks1to4','tracks5to8','frameGap','saved','savedCount','live','culprit','refusal']
  const valid = object(value) && fields(value, ['id','event','phase','base','active','error','result','refusal','reading','modules','packages','buildKind'])
    && typeof value.id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.id)
    && DIAGNOSTIC_EVENTS.some(event => event === value.event) && DIAGNOSTIC_PHASES.some(phase => phase === value.phase)
    && (!('base' in value) || hash(value.base)) && (!('active' in value) || hash(value.active))
    && (!('error' in value) || DIAGNOSTIC_ERRORS.some(error => error === value.error)) && (!('refusal' in value) || uint(value.refusal))
    && (!('result' in value) || DIAGNOSTIC_RESULTS.some(result => result === value.result))
    && (!('reading' in value) || object(value.reading) && Object.keys(value.reading).length === readingKeys.length && fields(value.reading, readingKeys) && Object.values(value.reading).every(uint))
    && (!('modules' in value) || Array.isArray(value.modules) && value.modules.length <= 64 && value.modules.every(module => object(module) && Object.keys(module).sort().join(',') === 'catalogVersion,id'
      && MODULES.some(known => known.id === module.id) && typeof module.catalogVersion === 'string' && /^[0-9][0-9A-Za-z.+-]{0,63}$/.test(module.catalogVersion)) && new Set(value.modules.map(module => module.id)).size === value.modules.length)
    && (!('packages' in value) || Array.isArray(value.packages) && value.packages.length <= 64 && value.packages.every(pack => object(pack) && Object.keys(pack).sort().join(',') === 'bytes,sha256' && hash(pack.sha256) && uint(pack.bytes)))
  const eventFields = valid && (value.event === 'browser_error' || value.event === 'unhandled_rejection'
    ? Object.keys(value).sort().join(',') === 'event,id,phase' && value.phase === 'browser'
    : value.event === 'build_failed'
      ? Object.keys(value).sort().join(',') === 'buildKind,error,event,id,phase' && DIAGNOSTIC_BUILD_KINDS.some(kind => kind === value.buildKind)
        && DIAGNOSTIC_BUILD_PHASES.some(phase => phase === value.phase) && DIAGNOSTIC_BUILD_ERRORS.some(error => error === value.error)
      : !('buildKind' in value) && DIAGNOSTIC_USB_PHASES.some(phase => phase === value.phase) && (!('error' in value) || DIAGNOSTIC_USB_ERRORS.some(error => error === value.error)))
  if (!eventFields) throw new HttpError(400, 'Invalid diagnostics. Only documented technical fields are accepted.')
  return value as unknown as OctatrackDiagnostic
}
async function consent(db: Database, userId: string, now = new Date()): Promise<DiagnosticConsent> {
  const row = await db.prepare('SELECT enabled,version,changed_at FROM octatrack_diagnostic_consent WHERE user_id=?').bind(userId).first<{ enabled: number; version: string; changed_at: string }>()
  const expiresAt = row ? new Date(Date.parse(row.changed_at) + DIAGNOSTIC_CONSENT_DAYS * 86400000).toISOString() : null
  return { accountId:userId, enabled: !!row?.enabled && row.version === OCTATRACK_DIAGNOSTICS_VERSION && row.changed_at <= now.toISOString() && expiresAt! > now.toISOString(), version: OCTATRACK_DIAGNOSTICS_VERSION, changedAt: row?.changed_at ?? null, expiresAt }
}
/** Hourly cleanup also removes data with expired consent or accounts that are no longer verified members. Reads enforce the same cutoff. */
export async function cleanupOctatrackDiagnostics(db: Database, now = new Date()) {
  await db.batch([
    db.prepare('DELETE FROM octatrack_diagnostic_events WHERE created_at<? OR user_id IN (SELECT user_id FROM octatrack_diagnostic_consent WHERE enabled=0 OR version<>? OR changed_at<=?) OR user_id IN (SELECT id FROM users WHERE suspended=1 OR email_verified=0)').bind(since(now, DIAGNOSTIC_RETENTION_DAYS), OCTATRACK_DIAGNOSTICS_VERSION, since(now, DIAGNOSTIC_CONSENT_DAYS)),
    db.prepare('DELETE FROM octatrack_beta_daily WHERE day<=?').bind(since(now, DIAGNOSTIC_RETENTION_DAYS).slice(0,10)),
  ])
}
export async function octatrackDiagnosticRoutes(request: Request, db: Database, user: User | null, admin: boolean): Promise<Response | null> {
  const path = new URL(request.url).pathname, now = new Date(), cutoff = since(now, DIAGNOSTIC_RETENTION_DAYS)
  if (path === '/api/admin/octatrack/diagnostics') {
    if (!admin) throw new HttpError(403, 'Administrator access required.')
    if (request.method !== 'GET') throw new HttpError(405, 'Use GET.')
    const rows = (await db.prepare('SELECT e.event_id AS eventId,e.created_at AS createdAt,e.data_json,u.username FROM octatrack_diagnostic_events e JOIN users u ON u.id=e.user_id JOIN octatrack_diagnostic_consent c ON c.user_id=e.user_id WHERE e.created_at>=? AND c.enabled=1 AND c.version=? AND c.changed_at>? AND c.changed_at<=? AND u.suspended=0 AND u.email_verified=1 ORDER BY e.created_at DESC,e.rowid DESC LIMIT 100').bind(cutoff,OCTATRACK_DIAGNOSTICS_VERSION,since(now,DIAGNOSTIC_CONSENT_DAYS),now.toISOString()).all<{ data_json: string }>()).results
    const counts = (await db.prepare('SELECT day,event,count FROM octatrack_beta_daily WHERE day>? ORDER BY day DESC,event').bind(cutoff.slice(0,10)).all()).results
    return response({ events: rows.map(({data_json,...row}) => ({...row,data:JSON.parse(data_json)})), counts })
  }
  if (!['/api/octatrack/diagnostics','/api/octatrack/diagnostics/consent'].includes(path)) return null
  const member = needMember(user)
  if (path.endsWith('/consent')) {
    if (request.method === 'GET') return response(await consent(db,member.id,now))
    if (request.method !== 'PUT') throw new HttpError(405, 'Use GET or PUT.')
    const body = await bodyOf(request)
    if (!object(body) || Object.keys(body).sort().join(',') !== 'enabled,version' || typeof body.enabled !== 'boolean' || body.version !== OCTATRACK_DIAGNOSTICS_VERSION) throw new HttpError(400, 'Choose whether to share the current diagnostics.')
    await db.batch([
      db.prepare('INSERT INTO octatrack_diagnostic_consent(user_id,enabled,version,changed_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND suspended=0 AND email_verified=1) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,version=excluded.version,changed_at=excluded.changed_at WHERE excluded.changed_at>octatrack_diagnostic_consent.changed_at OR (excluded.changed_at=octatrack_diagnostic_consent.changed_at AND excluded.enabled=0)').bind(member.id,Number(body.enabled),OCTATRACK_DIAGNOSTICS_VERSION,now.toISOString(),member.id),
      ...(!body.enabled ? [db.prepare('DELETE FROM octatrack_diagnostic_events WHERE user_id=? AND EXISTS(SELECT 1 FROM octatrack_diagnostic_consent WHERE user_id=? AND enabled=0)').bind(member.id,member.id)] : []),
    ])
    return response(await consent(db,member.id,now))
  }
  if (request.method === 'GET') {
    const rows = (await db.prepare('SELECT event_id AS eventId,created_at AS createdAt,data_json FROM octatrack_diagnostic_events WHERE user_id=? AND created_at>=? ORDER BY created_at DESC,rowid DESC').bind(member.id,cutoff).all<{data_json:string}>()).results
    return response({events:rows.map(({data_json,...row})=>({...row,data:JSON.parse(data_json)}))})
  }
  if (request.method !== 'POST') throw new HttpError(405, 'Use GET or POST.')
  if (!(await consent(db,member.id,now)).enabled) throw new HttpError(403, 'Current diagnostics consent is required.')
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return response({ok:true,stored:false})
  const body = await bodyOf(request)
  if (!object(body) || Object.keys(body).sort().join(',') !== 'data,version' || body.version !== OCTATRACK_DIAGNOSTICS_VERSION) throw new HttpError(400, 'Invalid diagnostics version.')
  const data = validateDiagnostic(body.data)
  await throttle(db,'octatrack-diagnostics:'+member.id,120,3600)
  const results = await db.batch([
    // Recheck in the insert so a concurrent withdrawal cannot be followed by a late queued upload.
    db.prepare('INSERT INTO octatrack_diagnostic_events(user_id,event_id,consent_version,data_json,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM octatrack_diagnostic_consent c JOIN users u ON u.id=c.user_id WHERE c.user_id=? AND c.enabled=1 AND c.version=? AND c.changed_at>? AND c.changed_at<=? AND u.suspended=0 AND u.email_verified=1) ON CONFLICT(user_id,event_id) DO NOTHING').bind(member.id,data.id,OCTATRACK_DIAGNOSTICS_VERSION,JSON.stringify(data),now.toISOString(),member.id,OCTATRACK_DIAGNOSTICS_VERSION,since(now,DIAGNOSTIC_CONSENT_DAYS),now.toISOString()),
    db.prepare('DELETE FROM octatrack_diagnostic_events WHERE user_id=? AND event_id NOT IN(SELECT event_id FROM octatrack_diagnostic_events WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1000)').bind(member.id,member.id),
  ])
  return response({ok:true,stored:!!(results[0] as {meta?:{changes?:number}}).meta?.changes})
}
