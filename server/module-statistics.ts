import type { Database } from './platform'
import { COMMUNITY_MODULES } from '../src/community/modules'
import recipes from '../src/catalog/module-sets.json'
import type { ModuleStatistics } from '../src/community/module-statistics'
import { WORKS_REPORT_POST } from './hardware-reports'
// Issue reports enter only as counts and dates for the stability grade, private or public alike; nothing else about
// a report leaves the inbox.
export async function moduleStatistics(db: Database): Promise<ModuleStatistics[]> {
  const [publications,meta,statistics] = await Promise.all([
    db.prepare('SELECT module_id FROM module_publications').all<{module_id:string}>(),
    db.prepare("SELECT value FROM module_download_meta WHERE key='collection_started'").first<{value:string}>(),
    db.prepare(`WITH w AS (SELECT t.module_id,COUNT(DISTINCT p.user_id) AS worksReports FROM forum_posts p JOIN forum_threads t ON t.id=p.thread_id JOIN users wu ON wu.id=p.user_id WHERE t.id='module-' || t.module_id AND t.hidden=0 AND ${WORKS_REPORT_POST} GROUP BY t.module_id),
      ids AS (SELECT module_id FROM ratings UNION SELECT module_id FROM likes UNION SELECT module_id FROM module_downloads UNION SELECT module_id FROM issues UNION SELECT module_id FROM w),
      r AS (SELECT module_id,AVG(value) AS average,COUNT(*) AS count FROM ratings GROUP BY module_id),
      l AS (SELECT module_id,COUNT(*) AS likes FROM likes GROUP BY module_id),
      i AS (SELECT module_id,SUM(status='open') AS open_issues,MAX(created_at) AS last_issue FROM issues GROUP BY module_id)
      SELECT ids.module_id,COALESCE(r.average,0) AS average,COALESCE(r.count,0) AS count,COALESCE(l.likes,0) AS likes,COALESCE(d.downloads,0) AS downloads,
        d.first_download_at AS firstDownloadAt,COALESCE(i.open_issues,0) AS openIssues,strftime('%Y-%m-%dT%H:%M:%SZ',i.last_issue) AS lastIssueAt,COALESCE(w.worksReports,0) AS worksReports
      FROM ids LEFT JOIN r ON r.module_id=ids.module_id LEFT JOIN l ON l.module_id=ids.module_id LEFT JOIN module_downloads d ON d.module_id=ids.module_id LEFT JOIN i ON i.module_id=ids.module_id LEFT JOIN w ON w.module_id=ids.module_id`).all<Omit<ModuleStatistics,'downloadsStarted'>>(),
  ])
  const ids = new Set([...COMMUNITY_MODULES.map(module => module.id), ...recipes.map(recipe => 'remix-' + recipe.id), ...publications.results.map(module => module.module_id)])
  const downloadsStarted = meta?.value ?? null
  const totals = statistics.results
  const byId = new Map(totals.map(item => [item.module_id,item]))
  return [...ids].map(module_id => ({module_id,average:0,count:0,likes:0,downloads:0,worksReports:0,firstDownloadAt:null,openIssues:0,lastIssueAt:null,...byId.get(module_id),downloadsStarted}))
}
