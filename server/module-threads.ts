import type { Database } from './platform'
import { COMMUNITY_MODULES, moduleThreadId, type CommunityModule } from '../src/community/modules'
import { DEVICES_BY_ID } from '../src/devices/registry'
import { followModuleDevelopers } from './bug-reports'

/** Fixed author row for server-created threads; it has no username, sign-in or session. */
export const SYSTEM_AUTHOR = 'modwerk'

export function moduleThreadIntro(module: CommunityModule) {
  return `The home thread for ${module.name} on the ${DEVICES_BY_ID[module.machine].name}, created automatically for every module in the catalog.\n\n${module.summary}\n\nShare settings, questions, ideas and feedback here. For a bug, use “Report an issue” on the module page so its developers get the details they need.`
}

/** Create the missing module threads. Fixed IDs make concurrent or repeated runs harmless. */
export async function ensureModuleThreads(db: Database, modules: readonly CommunityModule[] = COMMUNITY_MODULES) {
  // A primary-key range instead of an IN list keeps the query within D1's bound-parameter limit as the catalog grows.
  const existing = new Set((await db.prepare("SELECT id FROM forum_threads WHERE id>='module-' AND id<'module.'").all<{ id: string }>()).results.map(row => row.id))
  const missing = modules.filter(module => !existing.has(moduleThreadId(module.id)))
  if (!missing.length) return 0
  await db.batch(missing.flatMap(module => {
    const id = moduleThreadId(module.id)
    return [
      db.prepare("INSERT OR IGNORE INTO forum_threads(id,user_id,title,category,machine,module_id) VALUES(?,?,?,'modules',?,?)").bind(id, SYSTEM_AUTHOR, module.name + ' discussion', module.machine, module.id),
      db.prepare('INSERT OR IGNORE INTO forum_posts(id,thread_id,user_id,body) VALUES(?,?,?,?)').bind(id, id, SYSTEM_AUTHOR, moduleThreadIntro(module)),
      followModuleDevelopers(db, module, id),
    ]
  }))
  return missing.length
}

const checked = new WeakSet<Database>()
/** The catalog is fixed per deployment, so one check per database binding is enough. */
export async function ensureModuleThreadsOnce(db: Database) {
  if (checked.has(db)) return
  // Reading the forum must keep working if this fails (for example before migration 0023); the next request retries.
  try { await ensureModuleThreads(db); checked.add(db) } catch (error) { console.error('Module threads could not be created.', error) }
}
