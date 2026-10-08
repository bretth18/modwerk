/** Count confirmed modules, never companions. Legacy records retain their source's
 * visibility; new confirmations are independent of forum posts. */
export const WORKING_REPORT_VISIBLE = "wu.email_verified=1 AND wu.suspended=0 AND wu.username IS NOT NULL AND (r.source_post_id IS NULL OR (p.hidden=0 AND wt.hidden=0))"
export const WORKING_REPORT_JOINS = 'FROM module_working_reports r JOIN users wu ON wu.id=r.user_id LEFT JOIN forum_posts p ON p.id=r.source_post_id LEFT JOIN forum_threads wt ON wt.id=p.thread_id'

/** moduleId is a trusted SQL column expression, never request data. */
export function worksReportCount(moduleId: string) {
  return `(SELECT COUNT(DISTINCT r.user_id) ${WORKING_REPORT_JOINS} WHERE r.module_id=${moduleId} AND ${WORKING_REPORT_VISIBLE})`
}
