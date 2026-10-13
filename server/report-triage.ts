import { compareModuleVersions } from '../src/catalog/versions'
import { REPORT_KINDS, REPORT_TRIAGE_STATES, reportStatusLabel, type ReportKind, type ReportTriageState, type ReportMetadata } from '../src/community/report-closure'
import { githubCommentOnce, inert, type GithubConfig } from './github'
import { claimGithubAction } from './github-actions'
import type { Database } from './platform'
import { digest, HttpError, required } from './security'

export type TriagedReport = ReportMetadata & { id: string; status: string; scope: 'module' | 'configuration'; github_number: number | null }

/** Used by GitHub commands and consent-controlled site actions after their existing ownership checks. */
export function validateReportTriage(report: TriagedReport, body: Record<string, unknown>) {
  if (report.status !== 'open') throw new HttpError(409, 'Reopen the report before changing its triage.')
  const kindAction = body.reportKind !== undefined
  const fields = kindAction ? ['reportKind', 'note'] : ['triageState', 'note', 'affectedVersion']
  if (Object.keys(body).some(key => !fields.includes(key))) throw new HttpError(400, 'Choose one triage action.')
  const note = required(body.note, 'Triage explanation', 2000)
  let kind = report.report_kind ?? 'bug', state = report.triage_state ?? 'untriaged', affected = report.affected_version ?? null
  const confirmed = report.confirmed_at ?? null
  if (kindAction) {
    if (typeof body.reportKind !== 'string' || !Object.hasOwn(REPORT_KINDS, body.reportKind)) throw new HttpError(400, 'Choose bug, question or feature.')
    kind = body.reportKind as ReportKind
    if (kind !== report.report_kind) { state = 'untriaged'; affected = null }
  } else {
    if (typeof body.triageState !== 'string' || !Object.hasOwn(REPORT_TRIAGE_STATES, body.triageState)) throw new HttpError(400, 'Choose a supported report state.')
    state = body.triageState as ReportTriageState
    if (state === 'confirmed') {
      if (kind !== 'bug') throw new HttpError(400, 'Classify the report as a bug before confirming it.')
      if (body.affectedVersion !== 'unknown') {
        affected = required(body.affectedVersion, 'Affected version or unknown', 100)
        try { compareModuleVersions(affected, affected) } catch { throw new HttpError(400, 'Use an exact semantic version or unknown.') }
        if (report.scope === 'configuration') throw new HttpError(400, 'Use unknown for a configuration report; its cause is not attributed to one module.')
      } else affected = null
    } else {
      if (body.affectedVersion !== undefined) throw new HttpError(400, 'An affected version belongs to the confirm action.')
      if (state === 'awaiting_verification' && (!confirmed || kind !== 'bug')) throw new HttpError(409, 'Confirm the bug before marking a fix awaiting verification.')
      if (state === 'untriaged') affected = null
    }
  }
  return { kind, state, affected, note, kindAction, confirming: !kindAction && state === 'confirmed', resetting: kindAction ? kind !== (report.report_kind ?? 'bug') : state === 'untriaged' }
}

export async function updateReportTriage(db: Database, report: TriagedReport, body: Record<string, unknown>, actor: { id: string; memberId?: string; githubLogin?: string }, eventId: string, config: GithubConfig | null, marker = '<!-- modwerk-triage:' + eventId + ' -->') {
  const change = validateReportTriage(report, body)
  const label = reportStatusLabel({ status: 'open', triage_state: change.state })
  const text = (change.kindAction ? 'Report classified as **' + REPORT_KINDS[change.kind] + '**.' : 'Status: **' + label + '**.') +
    (change.confirming ? '\n\nAffected version: **' + (change.affected ?? 'Unknown') + '**.' : '') +
    '\n\n' + inert(change.note).split(/\r?\n/).map(line => '> ' + line).join('\n')
  const publicationKey = eventId.startsWith('command:') ? eventId : 'triage:'+eventId
  const receipt = report.github_number !== null && !eventId.startsWith('command:') ? await claimGithubAction(db,publicationKey,report.id,actor.id,JSON.stringify(body)) : null
  try {
    // Publish first. An upstream failure must not leave the site claiming a completed public action.
    if (report.github_number !== null) {
      if (!config) throw new HttpError(503, 'GitHub report triage is not configured.')
      // Bind the command acknowledgement before publication; its signed webhook can arrive before the response.
      await db.prepare('UPDATE github_actions SET published_hash=? WHERE id=? AND issue_id=?').bind(await digest(text+'\n\n'+marker),publicationKey,report.id).run()
      await githubCommentOnce(config, report.github_number, marker, text)
    }
    const fresh = ' AND NOT EXISTS(SELECT 1 FROM issue_triage_events WHERE id=?)'
    const eligible = " AND report_kind=?" + (change.state === 'awaiting_verification' && !change.kindAction ? " AND confirmed_at IS NOT NULL" : '')
    const changed = '(report_kind<>? OR (?=0 AND triage_state<>?) OR (?=1 AND affected_version IS NOT ?) OR triage_note<>?)'
    await db.batch([
      db.prepare(`INSERT INTO notifications(id,user_id,kind,actor_id,issue_id,module_id,github_actor,excerpt,delivery_id)
      SELECT lower(hex(randomblob(16))),i.reporter_id,'issue_comment',?,i.id,i.module_id,?,?,? FROM issues i JOIN users u ON u.id=i.reporter_id
      WHERE i.id=? AND i.status='open' AND ${changed} AND u.email_verified=1 AND u.suspended=0 AND i.reporter_id IS NOT ?${eligible}${fresh} ON CONFLICT DO NOTHING`)
        .bind(actor.memberId ?? null, actor.githubLogin ?? null, (change.kindAction ? REPORT_KINDS[change.kind] : label) + ': ' + change.note.slice(0, 300), 'triage:' + eventId, report.id, change.kind, Number(change.kindAction), change.state, Number(change.confirming || change.resetting), change.affected, change.note, actor.memberId ?? null, report.report_kind ?? 'bug', eventId),
      // Waiting or investigating must preserve confirmation made by another request after this one was read.
      db.prepare(`UPDATE issues SET report_kind=?,triage_state=CASE WHEN ?=1 AND ?=0 THEN triage_state ELSE ? END,affected_version=CASE WHEN ?=1 THEN ? WHEN ?=1 THEN NULL ELSE affected_version END,triage_note=?,confirmed_at=CASE WHEN ?=1 THEN COALESCE(confirmed_at,CURRENT_TIMESTAMP) WHEN ?=1 THEN NULL ELSE confirmed_at END,triaged_at=CURRENT_TIMESTAMP WHERE id=? AND status='open'${eligible}${fresh}`)
        .bind(change.kind, Number(change.kindAction), Number(change.resetting), change.state, Number(change.confirming), change.affected, Number(change.resetting), change.note, Number(change.confirming), Number(change.resetting), report.id, report.report_kind ?? 'bug', eventId),
      db.prepare(`INSERT INTO issue_triage_events(id,issue_id,actor,github_login,triage_state,report_kind,affected_version,note)
      SELECT ?,id,?,?,triage_state,report_kind,affected_version,triage_note FROM issues WHERE id=? AND changes()>0${fresh}`)
        .bind(eventId, actor.id, actor.githubLogin ?? null, report.id, eventId),
    ])
    if (!await db.prepare('SELECT id FROM issue_triage_events WHERE id=?').bind(eventId).first()) throw new HttpError(409, 'The report changed during triage. Refresh its status before trying again.')
    await receipt?.complete()
    return text
  } catch(error) {
    await receipt?.release()
    if(error instanceof HttpError)throw error
    throw new HttpError(502,'Report triage could not complete. Check its status and retry; no completed action is claimed.')
  }
}
