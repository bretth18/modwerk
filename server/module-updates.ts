import type { Database, Env } from './platform'
import { compareModuleVersions } from '../src/catalog/versions'
import { parseModuleReleases, type ModuleRelease } from '../src/community/module-release-contract'
import { communityModule } from '../src/community/modules'
import { needMember, throttle } from './auth'
import { emailReady } from './email'
import { moduleReleaseAnnouncement } from './announcements'
import { HttpError, jsonBody, response } from './security'

/** A new report follows module releases unless its reporter declines this in the form. */
export function followReportedModule(db: Database, moduleId: string, userId: string) {
  return db.prepare(`INSERT INTO module_update_subscriptions(user_id,module_id,after_version) VALUES(?,?,COALESCE((SELECT version FROM module_release_state WHERE module_id=?),?)) ON CONFLICT(user_id,module_id) DO NOTHING`).bind(userId, moduleId, moduleId, communityModule(moduleId)?.version ?? null)
}

export async function moduleUpdateRoutes(request: Request, env: Env, db: Database, moduleId: string, user: Parameters<typeof needMember>[0]) {
  const member = needMember(user)
  // Reviewed catalog modules have release versions; sets and legacy contributions have no versioned publication flow.
  if (!communityModule(moduleId)) throw new HttpError(404, 'Update notifications are available for catalog modules.')
  if (request.method === 'PATCH') {
    const body = await jsonBody(request)
    if (typeof body.enabled !== 'boolean' || Object.keys(body).some(key => key !== 'enabled')) throw new HttpError(400, 'Choose whether to follow module updates.')
    await throttle(db, 'module-updates:' + member.id, 60)
    if (body.enabled) await followReportedModule(db, moduleId, member.id).run()
    else await db.prepare('DELETE FROM module_update_subscriptions WHERE user_id=? AND module_id=?').bind(member.id, moduleId).run()
  } else if (request.method !== 'GET') throw new HttpError(405, 'Choose a supported module update action.')
  const [subscribed, preference, release] = await Promise.all([
    db.prepare('SELECT 1 AS enabled FROM module_update_subscriptions WHERE user_id=? AND module_id=?').bind(member.id, moduleId).first(),
    db.prepare('SELECT email_enabled,updates FROM notification_preferences WHERE user_id=?').bind(member.id).first<{ email_enabled: number; updates: number }>(),
    db.prepare('SELECT version FROM module_release_state WHERE module_id=?').bind(moduleId).first<{ version: string }>(),
  ])
  return response({ enabled: !!subscribed, emailEnabled: !preference || !!preference.email_enabled && !!preference.updates, emailAvailable: emailReady(env), version: release?.version ?? communityModule(moduleId)!.version })
}

/** Monotonic versions and per-recipient release keys keep retries/concurrent cron runs quiet. */
export async function recordModuleReleases(db: Database, releases: ModuleRelease[]) {
  let notified = 0
  // The first live inventory establishes a baseline; it must not announce the whole existing library.
  const initialized = !!await db.prepare('SELECT 1 AS initialized FROM module_release_inventory WHERE singleton=1').first()
  for (const release of releases) {
    const previous = await db.prepare('SELECT version FROM module_release_state WHERE module_id=?').bind(release.id).first<{ version: string }>()
    if (previous && compareModuleVersions(release.version, previous.version) <= 0) continue
    const followers = (await db.prepare('SELECT s.user_id,s.after_version FROM module_update_subscriptions s JOIN users u ON u.id=s.user_id JOIN auth_users a ON a.id=u.id WHERE s.module_id=? AND u.email_verified=1 AND a.emailVerified=1 AND u.suspended=0 AND u.username IS NOT NULL AND NOT EXISTS(SELECT 1 FROM social_pending_accounts p WHERE p.user_id=u.id)').bind(release.id).all<{ user_id: string; after_version: string | null }>()).results
    const recipients = followers.filter(member => member.after_version !== null && compareModuleVersions(release.version, member.after_version) > 0)
    const statements = [
      db.prepare('INSERT INTO module_releases(module_id,version,name,href) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(release.id, release.version, release.name, release.href),
      ...(!previous && initialized ? [await moduleReleaseAnnouncement(db, release)] : []),
      ...recipients.map(member => db.prepare(`INSERT INTO notifications(id,user_id,kind,module_id,module_version,delivery_id) SELECT lower(hex(randomblob(16))),?,'module_update',?,?,? WHERE EXISTS(SELECT 1 FROM module_update_subscriptions WHERE user_id=? AND module_id=? AND after_version=?) ON CONFLICT DO NOTHING`).bind(member.user_id, release.id, release.version, 'module-release:' + release.id + ':' + release.version, member.user_id, release.id, member.after_version)),
      // Do not move a subscriber back from a newer version if an old cached site is served.
      ...followers.filter(member => member.after_version === null || compareModuleVersions(release.version, member.after_version) > 0).map(member => db.prepare('UPDATE module_update_subscriptions SET after_version=? WHERE user_id=? AND module_id=? AND after_version IS ?').bind(release.version, member.user_id, release.id, member.after_version)),
      db.prepare('INSERT INTO module_release_state(module_id,version) VALUES(?,?) ON CONFLICT(module_id) DO UPDATE SET version=excluded.version WHERE module_release_state.version IS ?').bind(release.id, release.version, previous?.version ?? null),
    ]
    // Bound D1 batches while retaining retry-safe fanout.
    if (statements.length > 90) {
      // Fanout is performed in small idempotent batches; the state advances only after every recipient is stored.
      await db.batch(statements.slice(0, 1))
      for (let index = 1; index < statements.length - 1; index += 80) await db.batch(statements.slice(index, Math.min(index + 80, statements.length - 1)))
      await db.batch(statements.slice(-1))
    } else await db.batch(statements)
    notified += recipients.length
  }
  if (releases.length) await db.prepare('INSERT INTO module_release_inventory(singleton) VALUES(1) ON CONFLICT DO NOTHING').run()
  return { checked: releases.length, notified }
}

/** Read the live site's published inventory, rather than the Worker's independently deployed source catalog. */
export async function syncModuleReleases(env: Env, db: Database) {
  if (!env.APP_URL) return { checked: 0, notified: 0 }
  const app = new URL(env.APP_URL)
  app.pathname = app.pathname.replace(/\/?$/, '/'); app.search = ''; app.hash = ''
  const url = new URL('module-releases.json', app)
  const result = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } })
  if (result.status === 404) return { checked: 0, notified: 0 } // The previous site can still be live during rollout.
  if (!result.ok) throw new Error('Published module versions could not be checked.')
  const body = await result.text()
  if (body.length > 256 * 1024) throw new Error('Module release inventory is too large.')
  return recordModuleReleases(db, parseModuleReleases(JSON.parse(body)))
}
