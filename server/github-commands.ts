import registeredAuthors from '../.github/module-authors.json'
import { communityModule } from '../src/community/modules'
import { isReportClosureReason } from '../src/community/report-closure'
import { throttle } from './auth'
import { claimGithubAction } from './github-actions'
import { closeGithubReport, githubCommentOnce, inert, setGithubIssueState, type GithubConfig, type WebhookPayload } from './github'
import { issueStatusStatements } from './issue-notifications'
import type { Database, Env } from './platform'
import { finishModuleRelease } from './release-completion'
import { digest, HttpError, required } from './security'
import { updateReportTriage, type TriagedReport } from './report-triage'

const help = 'Post a new comment: `/modwerk needs-info <question>`, `/modwerk investigate <explanation>`, `/modwerk confirm <affected-version|unknown> <evidence>`, `/modwerk awaiting-verification <explanation>`, `/modwerk unconfirm <explanation>`, `/modwerk classify bug|question|feature <explanation>`, `/modwerk close configuration|duplicate|not_reproducible|insufficient_information|withdrawn <explanation>`, or `/modwerk reopen <explanation>`. Use `/modwerk resolve <version> verified-download` only after verifying that exact published download on your unit. A whole-configuration report names the module: `/modwerk resolve <module-id> <version> verified-download`. Replying and managing reports require no fork or repository write access. Registered authors need no site claim; other declared maintainers verify GitHub and claim their module once in Creator settings.'

/** Only newly created, signed comments by a registered numeric GitHub identity can act. */
export async function handleGithubCommand(env: Env, db: Database, config: GithubConfig, issueId: string, number: number, payload: WebhookPayload) {
  const comment = payload.comment!, user = comment.user, login = typeof user?.login === 'string' ? user.login : '', id = user?.id
  if (user?.type !== 'User' || !Number.isSafeInteger(id) || payload.sender?.id !== id || payload.sender?.login !== login || !Number.isSafeInteger(comment.id) || Number(comment.id) <= 0) return { command: 'ignored' }
  const report = await db.prepare('SELECT * FROM issues WHERE id=? AND public_json IS NOT NULL AND github_number=?').bind(issueId, number).first<TriagedReport & { module_id: string; maintainer_sharing: number; public_sharing: number }>()
  // A whole-configuration report belongs to every module in it; a maintainer acts for the modules they maintain, and a revoked one drops out.
  const reported = !report ? [] : report.scope === 'configuration' ? (await db.prepare('SELECT module_id FROM issue_modules WHERE issue_id=? ORDER BY rowid').bind(issueId).all<{ module_id: string }>()).results.map(item => item.module_id) : [report.module_id]
  const registered = (registeredAuthors.accounts as Record<string, number>)[login.toLowerCase()]
  const suspended = await db.prepare("SELECT 1 FROM users u WHERE (u.github_id=? OR EXISTS(SELECT 1 FROM auth_accounts a WHERE a.userId=u.id AND a.providerId='github' AND a.accountId=?)) AND u.suspended=1 LIMIT 1").bind(String(id), String(id)).first()
  const revoked = new Set(reported.length ? (await db.prepare(`SELECT m.module_id FROM module_maintainers m JOIN users u ON u.id=m.user_id WHERE m.module_id IN (${reported.map(() => '?').join(',')}) AND m.revoked=1 AND (u.github_id=? OR lower(m.github_login)=lower(?))`).bind(...reported, String(id), login).all<{ module_id: string }>()).results.map(item => item.module_id) : [])
  const maintained = reported.flatMap(moduleId => { const module = communityModule(moduleId); return module && !revoked.has(moduleId) && module.maintainers.some(handle => handle.toLowerCase() === login.toLowerCase()) ? [module] : [] })
  // A verified, current site claim also identifies a maintainer numerically. It grants triage, never author-release authority.
  const claimed = maintained.length ? await db.prepare(`SELECT 1 FROM module_maintainers m JOIN users u ON u.id=m.user_id WHERE m.module_id IN (${maintained.map(() => '?').join(',')}) AND m.revoked=0 AND u.suspended=0 AND u.github_id=? AND lower(u.github_login)=lower(?) AND lower(m.github_login)=lower(?) LIMIT 1`).bind(...maintained.map(module => module.id),String(id),login,login).first() : null
  if (!report?.maintainer_sharing || report.public_sharing || (registered ? registered !== id : !claimed) || suspended || !maintained.length) return { command: 'denied' }
  const body = String(comment.body).trim(), key = 'command:' + comment.id
  const receipt = await claimGithubAction(db, key, issueId, String(id), body)
  if (!receipt) return { command: 'already-completed' }
  try {
    await throttle(db, 'github-command:' + id, 30)
    const match = body.match(/^\/modwerk (help|close|reopen|resolve|needs-info|investigate|confirm|awaiting-verification|unconfirm|classify)(?:\s+([\s\S]+))?$/)
    let result = '', outcome = 'completed'
    try {
      if (!match) throw new HttpError(400, help)
      const argument = match[2] ?? ''
      if (match[1] === 'help') {
        result = help + '\n\n[Maintainer workflow](https://github.com/repeat98/modwerk/blob/main/docs/DEVELOPER_WORKFLOW.md#manage-reports-on-github)'
      } else if (match[1] === 'resolve') {
        if (registered !== id) throw new HttpError(403,'Verified maintainer claims can triage and close reports; verified firmware resolution requires the registered release-author identity.')
        // On a whole-configuration report the release belongs to one module, which the command names.
        const resolve = report.scope === 'configuration' ? argument.match(/^(\S+) (\S+) verified-download$/) : argument.match(/^(\S+) verified-download$/)
        if (!resolve) throw new HttpError(400, help)
        const module = report.scope === 'configuration' ? maintained.find(item => item.id === resolve[1]) : maintained[0]
        if (!module) throw new HttpError(403, 'Name a module of this configuration that you maintain.')
        const completed = await finishModuleRelease(env, db, module, resolve[report.scope === 'configuration' ? 2 : 1], [issueId], { id: null, githubLogin: login })
        result = 'Released **' + inert(completed.version) + '**. ' + completed.updateNotificationsQueued + ' module update notifications queued; delivery follows members’ preferences and the existing push/email schedule.'
      } else if (match[1] === 'close') {
        const close = argument.match(/^(\S+)\s+([\s\S]+)$/)
        if (!close || !isReportClosureReason(close[1])) throw new HttpError(400, help)
        const note = required(close[2], 'Public explanation', 2000)
        await closeGithubReport(config, number, close[1], note, login)
        await db.batch(issueStatusStatements(db, issueId, 'closed', null, login, null, false, close[1],note))
        result = 'Report closed with an explanation; Modwerk status and the reporter notification are synchronized. No firmware release is claimed.'
      } else if (match[1] === 'reopen') {
        const note = required(argument, 'Public explanation', 2000)
        await githubCommentOnce(config, number, '<!-- modwerk-reopen:' + comment.id + ' -->', 'Reopened by **' + inert(login) + '**.\n\n' + inert(note).split(/\r?\n/).map(line => '> ' + line).join('\n'))
        await setGithubIssueState(config, number, 'open')
        await db.batch(issueStatusStatements(db, issueId, 'open', null, login))
        result = 'Report reopened on GitHub and Modwerk.'
      } else {
        const action = match[1]
        let change: Record<string, unknown>
        if (action === 'classify' || action === 'confirm') {
          const parts = argument.match(/^(\S+)\s+([\s\S]+)$/)
          if (!parts) throw new HttpError(400, help)
          change = action === 'classify' ? { reportKind: parts[1], note: parts[2] } : { triageState: 'confirmed', affectedVersion: parts[1], note: parts[2] }
        } else {
          const states: Record<string, string> = { 'needs-info': 'needs_info', investigate: 'investigating', 'awaiting-verification': 'awaiting_verification', unconfirm: 'untriaged' }
          change = { triageState: states[action], note: argument }
        }
        result = await updateReportTriage(db, report, change, { id: String(id), githubLogin: login }, key, config, '<!-- modwerk-command:' + comment.id + ' -->')
      }
    } catch (error) {
      if (!(error instanceof HttpError) || error.status >= 500 || error.status === 429) throw error
      result = 'Command could not complete: ' + inert(error.message)
      outcome = 'rejected'
    }
    const marker = '<!-- modwerk-command:' + comment.id + ' -->'
    await db.prepare('UPDATE github_actions SET published_hash=? WHERE id=?').bind(await digest(result+'\n\n'+marker),key).run()
    await githubCommentOnce(config, number, marker, result)
    await receipt.complete()
    return { command: outcome }
  } catch {
    await receipt.release()
    try { await githubCommentOnce(config, number, '<!-- modwerk-command-error:' + comment.id + ' -->', 'The command could not be confirmed. Post a new command or redeliver its webhook to retry. Check the issue status before assuming it completed; no firmware verification has been added by this failure.') } catch { /* The provider may also be unavailable for feedback. */ }
    throw new HttpError(502, 'GitHub command could not complete. Redeliver this webhook or post a new command to retry.')
  }
}
