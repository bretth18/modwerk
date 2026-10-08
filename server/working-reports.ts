import { COMMUNITY_MODULES, communityModule } from '../src/community/modules'
import { DEVICES_BY_ID } from '../src/devices/registry'
import { readHardwareReport } from '../src/community/hardware-report'
import type { WorkingReportBuild } from '../src/community/working-report-contract'
import type { Database, User } from './platform'
import { needMember, throttle } from './auth'
import { digest, HttpError, jsonBody, optional, required, response } from './security'

const versionPattern = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/
function moduleFor(id: unknown) {
  const module = typeof id === 'string' && communityModule(id)
  if (!module) throw new HttpError(400, 'Choose a known module.')
  return module
}
function buildContext(value: unknown, machineId: string): WorkingReportBuild | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Choose a downloaded build.')
  const input = value as Record<string, unknown>, device = DEVICES_BY_ID[machineId]
  const machine = required(input.machine, 'Instrument', 80)
  if (!device || ![device.name, ...(device.variants ?? []).map(variant => device.name + ' ' + variant)].includes(machine)) throw new HttpError(400, 'The build must match the tested instrument.')
  const os = optional(input.os, 'OS version', 64)
  if (os && !/^[\w.+-]+$/.test(os)) throw new HttpError(400, 'Choose a valid OS version.')
  if (!Array.isArray(input.modules) || !input.modules.length || input.modules.length > 64) throw new HttpError(400, 'Choose a build with 1–64 modules.')
  const modules = input.modules.map(item => {
    if (!item || typeof item !== 'object') throw new HttpError(400, 'Choose a known build module.')
    const module = moduleFor(item.id), version = required(item.version, 'Module version', 64)
    if (module.machine !== machineId || !versionPattern.test(version)) throw new HttpError(400, 'Build modules must match the instrument and have valid versions.')
    return { id: module.id, name: module.name, version }
  }).sort((a, b) => a.id.localeCompare(b.id))
  if (new Set(modules.map(module => module.id)).size !== modules.length) throw new HttpError(400, 'List each build module once.')
  return { machine, os, modules }
}

/** Normalize saved forum metadata without guessing a version or confirming companions.
 * Bounded reads drain the migration backlog; the original posts remain intact. */
export async function backfillWorkingReports(db: Database, moduleId?: string) {
  const rows = (await db.prepare(`SELECT r.id,r.module_id,p.body FROM module_working_reports r JOIN forum_posts p ON p.id=r.source_post_id WHERE r.context_pending=1 ${moduleId ? 'AND r.module_id=?' : ''} LIMIT 100`).bind(...(moduleId ? [moduleId] : [])).all<{ id: string; module_id: string; body: string }>()).results
  if (!rows.length) return
  await db.batch(rows.map(row => {
    const module = communityModule(row.module_id), report = readHardwareReport(row.body)
    const machine = report?.machine ?? row.body.match(/^\*\*Works on my ([^*\r\n]+)\*\*/)?.[1] ?? null
    const tested = report && module && report.module.name === module.name ? report.module.version : null
    const companions = report && module ? report.companions.flatMap(item => {
      const companion = COMMUNITY_MODULES.find(candidate => candidate.machine === module.machine && candidate.name === item.name)
      return [{ id: companion?.id ?? null, name: item.name, version: item.version }]
    }) : []
    const build = report && module && tested ? JSON.stringify({ machine: report.machine, os: report.os ?? '', modules: [{ id: module.id, name: module.name, version: tested }, ...companions] }) : null
    return db.prepare('UPDATE module_working_reports SET machine=?,os=?,module_version=?,build_json=?,context_pending=0 WHERE id=? AND context_pending=1 AND EXISTS(SELECT 1 FROM forum_posts WHERE id=source_post_id AND body=?)').bind(machine, report?.os ?? null, tested, build, row.id, row.body)
  }))
}

export async function workingReportRoute(request: Request, db: Database, user: User | null) {
  if (request.method !== 'POST') throw new HttpError(405, 'Use the working report button.')
  const member = needMember(user), body = await jsonBody(request)
  if (!Array.isArray(body.testedModuleIds) || !body.testedModuleIds.length || body.testedModuleIds.length > 64 || new Set(body.testedModuleIds).size !== body.testedModuleIds.length) throw new HttpError(400, 'Select the modules you tested.')
  const tested = body.testedModuleIds.map(moduleFor), machineId = tested[0].machine
  if (tested.some(module => module.machine !== machineId)) throw new HttpError(400, 'Tested modules must use the same instrument.')
  const build = buildContext(body.build, machineId)
  if (!build && tested.length !== 1 || build && tested.some(module => !build.modules.some(item => item.id === module.id))) throw new HttpError(400, 'Tested modules must belong to the downloaded build.')
  await throttle(db, 'working-report-ip:' + (request.headers.get('CF-Connecting-IP') ?? 'local'), 60)
  await throttle(db, 'working-report:' + member.id, 60)
  const context = build ? JSON.stringify(build) : null, contextKey = build ? await digest(context!) : 'unknown'
  await db.batch(tested.map(module => db.prepare('INSERT INTO module_working_reports(id,user_id,module_id,context_key,machine,os,module_version,build_json) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,module_id,context_key) DO NOTHING').bind(crypto.randomUUID(), member.id, module.id, contextKey, build?.machine ?? DEVICES_BY_ID[machineId].name, build?.os || null, build?.modules.find(item => item.id === module.id)?.version ?? null, context)))
  return response({ ok: true, testedModuleIds: tested.map(module => module.id) })
}
