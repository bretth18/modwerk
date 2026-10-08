/** Positive reply labels, including manual “Works” replies. Count people, not posts, across module versions.
 * Only visible module home threads and replies from active verified members contribute. */
export const WORKS_REPORT_POST = "p.hidden=0 AND wu.email_verified=1 AND wu.suspended=0 AND wu.username IS NOT NULL AND p.body GLOB '[*][*]Works on my ?*[*][*]*'"

/** moduleId is a trusted SQL column expression, never request data. */
export function worksReportCount(moduleId: string) {
  return `(SELECT COUNT(DISTINCT p.user_id) FROM forum_posts p JOIN forum_threads wt ON wt.id=p.thread_id JOIN users wu ON wu.id=p.user_id WHERE wt.id='module-' || ${moduleId} AND wt.hidden=0 AND ${WORKS_REPORT_POST})`
}
