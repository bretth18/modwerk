import type { Database } from './platform'
import { COMMUNITY_MODULES, communityModule, moduleThreadId, type CommunityModule } from '../src/community/modules'
import { DEVICES_BY_ID } from '../src/devices/registry'
import { followModuleDevelopers } from './bug-reports'
import { HttpError } from './security'

/** Fixed author row for server-created threads; it has no username, sign-in or session. */
export const SYSTEM_AUTHOR = 'modwerk'

export function moduleThreadIntro(module: CommunityModule) {
  return `The home thread for ${module.name} on the ${DEVICES_BY_ID[module.machine].name}, created automatically for every module in the catalog.\n\n${module.summary}\n\nShare settings, questions, ideas and feedback here. For a bug, use “Report an issue” on the module page so its developers get the details they need.`
}

/** Create the missing module threads. Fixed IDs make concurrent or repeated runs harmless. */
export async function ensureModuleThreads(db: Database, modules: readonly CommunityModule[] = COMMUNITY_MODULES) {
  // A primary-key range instead of an IN list keeps the query within D1's bound-parameter limit as the catalog grows.
  const existing = new Map((await db.prepare("SELECT id,title FROM forum_threads WHERE id>='module-' AND id<'module.'").all<{ id: string; title: string }>()).results.map(row => [row.id,row.title]))
  const missing = modules.filter(module => !existing.has(moduleThreadId(module.id)))
  // Migration 0028 uses IDs for modules whose home thread did not exist yet. Fill in catalog metadata.
  const repairs = modules.filter(module => existing.get(moduleThreadId(module.id)) === module.id + ' discussion')
  if (!missing.length && !repairs.length) return 0
  await db.batch([...repairs.flatMap(module => [
    db.prepare("UPDATE forum_threads SET title=?,machine=? WHERE id=? AND user_id=?").bind(module.name+' discussion',module.machine,moduleThreadId(module.id),SYSTEM_AUTHOR),
    db.prepare("UPDATE forum_posts SET body=? WHERE id=? AND user_id=? AND body='Share settings, questions, ideas and feedback about this module here.'").bind(moduleThreadIntro(module),moduleThreadId(module.id),SYSTEM_AUTHOR),
    followModuleDevelopers(db,module,moduleThreadId(module.id)),
  ]),...missing.flatMap(module => {
    const id = moduleThreadId(module.id)
    return [
      db.prepare("INSERT OR IGNORE INTO forum_threads(id,user_id,title,category,machine,module_id) VALUES(?,?,?,'modules',?,?)").bind(id, SYSTEM_AUTHOR, module.name + ' discussion', module.machine, module.id),
      db.prepare('INSERT OR IGNORE INTO forum_posts(id,thread_id,user_id,body) VALUES(?,?,?,?)').bind(id, id, SYSTEM_AUTHOR, moduleThreadIntro(module)),
      followModuleDevelopers(db, module, id),
    ]
  })])
  return missing.length
}

/** Published contributions use the same fixed thread ID as catalog modules. */
export async function ensureDiscussionThread(db: Database, moduleId: string) {
  if (moduleId.startsWith('remix-')) throw new HttpError(404,'Module sets do not have discussions. Use the included module’s discussion.')
  const module = communityModule(moduleId)
  if (module) { await ensureModuleThreads(db,[module]); return }
  const published = await db.prepare('SELECT s.title,s.description FROM module_publications p JOIN submissions s ON s.id=p.submission_id WHERE p.module_id=?').bind(moduleId).first<{title:string;description:string}>()
  if (!published) throw new HttpError(404,'Module not found.')
  const id=moduleThreadId(moduleId),name=published.title
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO forum_threads(id,user_id,title,category,machine,module_id) VALUES(?,?,?,'modules',?,?)").bind(id,SYSTEM_AUTHOR,name+' discussion',null,moduleId),
    db.prepare('INSERT OR IGNORE INTO forum_posts(id,thread_id,user_id,body) VALUES(?,?,?,?)').bind(id,id,SYSTEM_AUTHOR,published.description+'\n\nShare settings, questions, ideas and feedback here.'),
  ])
}

const checked = new WeakSet<Database>()
const pending = new WeakMap<Database, Promise<void>>()
/** Share initialization across the concurrent requests on the forum home page. */
export async function ensureModuleThreadsOnce(db: Database) {
  if (checked.has(db)) return
  const current=pending.get(db)
  if(current)return current
  const work=(async()=>{
    // Reading the forum must keep working if this fails; the next request retries.
    try { await ensureModuleThreads(db); const published=(await db.prepare('SELECT module_id FROM module_publications').all<{module_id:string}>()).results; for(const module of published)await ensureDiscussionThread(db,module.module_id); checked.add(db) } catch (error) { console.error('Module threads could not be created.', error) }
    finally { pending.delete(db) }
  })()
  pending.set(db,work)
  return work
}
