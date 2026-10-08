import type { Database, User } from './platform'
import { maintainedModules } from './developers'
import { throttle } from './auth'
import { HttpError, jsonBody, response } from './security'
import { communityModule } from '../src/community/modules'
import { defaultCreatorSupport, koFiUrl } from '../src/community/creator-support'

export async function moduleSupportRoutes(request: Request, db: Database, user: User | null, developer: User | null): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(/^\/api\/modules\/([a-z0-9-]+)\/support$/)
  if (!match) return null
  const id = match[1], module = communityModule(id)
  const publication = module ? null : await db.prepare('SELECT s.owner_id FROM module_publications p JOIN submissions s ON s.id=p.submission_id WHERE p.module_id=?').bind(id).first<{owner_id:string}>()
  if (!module && !publication) throw new HttpError(404, 'Module not found.')
  let actor: User | null = null
  if (module) {
    if (developer?.github_id && !developer.suspended && (await maintainedModules(db, developer)).some(item => item.id === id)) actor = developer
  } else if (user?.username && user.email_verified && !user.suspended && user.id === publication?.owner_id) actor = user
  if (request.method === 'GET') {
    const saved = await db.prepare('SELECT s.ko_fi_url,u.id,u.display_name,u.github_id,u.github_login,u.suspended FROM module_creator_support s JOIN users u ON u.id=s.user_id WHERE s.module_id=?').bind(id).first<User & {ko_fi_url:string}>()
    const active = saved && !saved.suspended && (module
      ? saved.github_id && (await maintainedModules(db, saved)).some(item => item.id === id)
      : saved.id === publication?.owner_id)
    let url = saved ? '' : defaultCreatorSupport(module?.author)
    if (active) { try { url = koFiUrl(saved.ko_fi_url) } catch { /* Hide invalid legacy data. */ } }
    return response({ koFiUrl: url, canEdit: !!actor })
  }
  if (request.method !== 'PATCH') throw new HttpError(405, 'Choose a supported creator support action.')
  if (!actor) throw new HttpError(403, 'Only a current claimed maintainer or the published module’s owner can change its support link.')
  const body = await jsonBody(request)
  if (Object.keys(body).length !== 1 || !('koFiUrl' in body)) throw new HttpError(400, 'Send only the Ko-fi link.')
  let url: string
  try { url = koFiUrl(body.koFiUrl) } catch (error) { throw new HttpError(400, (error as Error).message) }
  await throttle(db, 'creator-support:' + actor.id, 30)
  await db.batch([
    url || defaultCreatorSupport(module?.author)
      ? db.prepare('INSERT INTO module_creator_support(module_id,user_id,ko_fi_url) VALUES(?,?,?) ON CONFLICT(module_id) DO UPDATE SET user_id=excluded.user_id,ko_fi_url=excluded.ko_fi_url,updated_at=CURRENT_TIMESTAMP').bind(id, actor.id, url)
      : db.prepare('DELETE FROM module_creator_support WHERE module_id=?').bind(id),
    db.prepare('INSERT INTO developer_events(id,actor_id,module_id,action) VALUES(?,?,?,?)').bind(crypto.randomUUID(), actor.id, id, url ? 'support-link-updated' : 'support-link-removed'),
  ])
  return response({ koFiUrl: url, canEdit: true })
}
