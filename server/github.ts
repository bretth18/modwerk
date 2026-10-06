import { issueStatusStatements } from './issue-notifications'
import type { Database, Env } from './platform'
import { HttpError } from './security'
import { communityModule } from '../src/community/modules'

const API = 'https://api.github.com'
const BODY_LIMIT = 60000
export type GithubConfig = { token: string; repository: string }

/** Mirroring is on only with a token and a valid owner/name repository. */
export function githubConfig(env: Env): GithubConfig | null {
  const token = env.GITHUB_TOKEN?.trim() ?? '', repository = env.GITHUB_REPOSITORY?.trim() || 'repeat98/modwerk'
  return token && /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(repository) ? { token, repository } : null
}

async function github<T>(config: GithubConfig, path: string, method: string, body: unknown): Promise<T> {
  let result: Response
  try {
    result = await fetch(API + '/repos/' + config.repository + path, {
      method, body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
      headers: { Authorization: 'Bearer ' + config.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'octamod-community', 'X-GitHub-Api-Version': '2022-11-28' },
    })
  } catch { throw new Error('GitHub did not respond.') }
  if (!result.ok) {
    let message = ''
    try { message = String(((await result.json()) as { message?: unknown }).message ?? '') } catch { /* status is enough */ }
    throw new Error('GitHub answered ' + result.status + (message ? ': ' + message.slice(0, 200) : '') + '.')
  }
  return await result.json() as T
}

/**
 * Reporter text goes to a public issue: it must not ping people, link other
 * issues or inject markup. Mentions and #references get a zero-width space,
 * and angle brackets are escaped.
 */
export function inert(text: string) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/@(?=[A-Za-z0-9])/g, '@​').replace(/#(?=[0-9])/g, '#​')
}
const quote = (text: string) => inert(text).split(/\r?\n/).map(line => '> ' + line).join('\n')

/** What the reporter agreed to publish; the configuration, build fingerprint and log stay on the site. */
export type PublicBugDetails = { device: string; version: string; steps: string; expected: string; actual: string }
export type MirroredIssue = { id: string; module_id: string; title: string; reporter: string | null; owners: string[]; details: PublicBugDetails }

export function issueTitle(issue: Pick<MirroredIssue, 'module_id' | 'title'>) { return ('[' + issue.module_id + '] ' + issue.title).slice(0, 256) }
const GITHUB_LOGIN = /^[A-Za-z0-9-]{1,39}$/
const appLink = (app: string | undefined, hash: string) => { if (!app) return null; const url = new URL(app); url.hash = hash; return url.href }

export function issueMarkdown(issue: MirroredIssue, app?: string) {
  const owners = [...new Set(issue.owners.filter(login => GITHUB_LOGIN.test(login)).map(login => '@' + login))]
  const reporter = issue.reporter ? inert(issue.reporter) : 'a Modwerk member', profile = issue.reporter ? appLink(app, 'forum/profile/' + issue.reporter) : null
  const site = appLink(app, '') ?? 'https://modwerk.app/', details = appLink(app, 'developer/report/' + issue.id), { device, version, steps, expected, actual } = issue.details
  return ['Reported on [Modwerk](' + site + ') for **`' + issue.module_id + '`** by ' + (profile ? '[' + reporter + '](' + profile + ')' : reporter) + (owners.length ? ' · ' + owners.join(' ') : ''), '',
    '| | |', '| --- | --- |', '| Device | ' + inert(device).replace(/\|/g, '\\|') + ' |', '| Module version | ' + inert(version).replace(/\|/g, '\\|') + ' |', '',
    '### Steps to reproduce', '', quote(steps), '', '### Expected', '', quote(expected), '', '### Actual', '', quote(actual), '', '---',
    '_The reporter’s configuration, build fingerprint and device log are private' + (details ? '. Verified maintainers can [open them on Modwerk](' + details + ')' : '') + '. Comments and status changes here are sent to the reporter on Modwerk._',
  ].join('\n').slice(0, BODY_LIMIT)
}

export async function createGithubIssue(config: GithubConfig, issue: MirroredIssue, app?: string) {
  const created = await github<{ number: number; html_url: string }>(config, '/issues', 'POST', { title: issueTitle(issue), body: issueMarkdown(issue, app), labels: ['issue-report', 'module:' + issue.module_id] })
  if (!Number.isInteger(created.number) || typeof created.html_url !== 'string' || !created.html_url.startsWith('https://github.com/')) throw new Error('GitHub returned an unexpected issue.')
  return { number: created.number, url: created.html_url }
}

export async function setGithubIssueState(config: GithubConfig, number: number, status: 'open' | 'closed') {
  await github(config, '/issues/' + number, 'PATCH', status === 'closed' ? { state: 'closed', state_reason: 'completed' } : { state: 'open' })
}

/** Everyone GitHub should notify: the module author and its declared maintainers. */
function moduleOwners(moduleId: string, author: string) {
  return [author, ...(communityModule(moduleId)?.maintainers ?? [])]
}

type IssueRow = { id: string; module_id: string; author_login: string; title: string; reporter: string | null; github_state: string; public_json: string | null }

/**
 * Create the GitHub issue for a stored report. The report is kept whatever GitHub answers.
 * `stale` lets the administrator take over a claim left by a request that died mid-sync.
 */
export async function mirrorIssue(db: Database, env: Env, id: string, stale = false) {
  const config = githubConfig(env)
  if (!config) return { state: 'none' as const }
  const row = await db.prepare('SELECT i.id,i.module_id,i.author_login,i.title,i.github_state,i.public_json,u.username AS reporter FROM issues i JOIN users u ON u.id=i.reporter_id WHERE i.id=?').bind(id).first<IssueRow>()
  if (!row) throw new HttpError(404, 'Issue not found.')
  // Only reports whose reporter chose a public bug description are published, and only that description.
  if (!row.public_json) throw new HttpError(400, 'This report is private and cannot be published to GitHub.')
  // Claim the row so concurrent requests cannot open two GitHub issues.
  const claimable = stale ? "('none','pending','failed','syncing')" : "('none','pending','failed')"
  if (!await db.prepare("UPDATE issues SET github_state='syncing',github_error='' WHERE id=? AND github_state IN " + claimable + " RETURNING id").bind(id).first()) return { state: row.github_state as 'synced' | 'syncing' }
  try {
    const created = await createGithubIssue(config, { id: row.id, module_id: row.module_id, title: row.title, reporter: row.reporter, owners: moduleOwners(row.module_id, row.author_login), details: JSON.parse(row.public_json) as PublicBugDetails }, env.APP_URL)
    await db.prepare("UPDATE issues SET github_state='synced',github_number=?,github_url=?,github_error='' WHERE id=?").bind(created.number, created.url, id).run()
    return { state: 'synced' as const, url: created.url }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub mirroring failed.'
    await db.prepare("UPDATE issues SET github_state='failed',github_error=? WHERE id=?").bind(message.slice(0, 300), id).run()
    return { state: 'failed' as const, error: message }
  }
}

function hex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('') }
function sameText(a: string, b: string) { if (a.length !== b.length) return false; let difference = 0; for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index); return difference === 0 }

export async function signGithubPayload(secret: string, body: ArrayBuffer) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return 'sha256=' + hex(await crypto.subtle.sign('HMAC', key, body))
}

type WebhookPayload = { action?: unknown; issue?: { number?: unknown; state_reason?: unknown }; comment?: { body?: unknown; user?: { login?: unknown; type?: unknown } }; sender?: { login?: unknown }; repository?: { full_name?: unknown } }

/**
 * GitHub "issues" and "issue_comment" webhooks. Closing or reopening a mirrored issue updates the report's
 * status; status changes and comments notify the reporter. Only signed deliveries for the configured
 * repository count, and a redelivered event never notifies twice.
 */
export async function handleGithubWebhook(request: Request, env: Env, db: Database, body: ArrayBuffer) {
  const secret = env.GITHUB_WEBHOOK_SECRET?.trim() ?? '', config = githubConfig(env)
  if (!secret || !config) throw new HttpError(503, 'GitHub webhooks are not configured.')
  if (!sameText(request.headers.get('X-Hub-Signature-256') ?? '', await signGithubPayload(secret, body))) throw new HttpError(401, 'Invalid signature.')
  const event = request.headers.get('X-GitHub-Event')
  if (event !== 'issues' && event !== 'issue_comment') return { ok: true, handled: false }
  let payload: WebhookPayload
  try { payload = JSON.parse(new TextDecoder().decode(body)) } catch { throw new HttpError(400, 'Invalid payload.') }
  const number = payload.issue?.number
  if (!Number.isInteger(number) || String(payload.repository?.full_name ?? '').toLowerCase() !== config.repository.toLowerCase()) return { ok: true, handled: false }
  // Most issues and comments on the repository did not start on Modwerk.
  const issue=await db.prepare('SELECT id FROM issues WHERE github_number=?').bind(number).first<{id:string}>()
  if (!issue) return { ok: true, handled: false }
  const delivery = (request.headers.get('X-GitHub-Delivery') ?? '').slice(0, 100) || crypto.randomUUID()
  if(await db.prepare('SELECT id FROM github_webhook_deliveries WHERE id=?').bind(delivery).first())return {ok:true,handled:true}
  const notify = (kind: string, actor: unknown, excerpt: string | null) => db.prepare(`INSERT INTO notifications(id,user_id,kind,issue_id,module_id,github_actor,excerpt,delivery_id) SELECT lower(hex(randomblob(16))),i.reporter_id,?,i.id,i.module_id,?,?,? FROM issues i JOIN users u ON u.id=i.reporter_id WHERE i.github_number=? AND u.suspended=0 AND NOT EXISTS(SELECT 1 FROM github_webhook_deliveries WHERE id=?) ON CONFLICT DO NOTHING`)
    .bind(kind, typeof actor === 'string' && GITHUB_LOGIN.test(actor) ? actor : null, excerpt, delivery, number,delivery)
  if (event === 'issue_comment') {
    const comment = payload.comment
    // Bots (CI, release tooling) talk to developers, not reporters.
    if (payload.action !== 'created' || typeof comment?.body !== 'string' || comment.user?.type === 'Bot') return { ok: true, handled: false }
    await db.batch([notify('issue_comment', comment.user?.login, comment.body.slice(0, 400)),db.prepare('INSERT INTO github_webhook_deliveries(id,issue_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(delivery,issue.id)])
    return { ok: true, handled: true }
  }
  const status = payload.action === 'closed' ? 'closed' : payload.action === 'reopened' ? 'open' : null
  if (!status) return { ok: true, handled: false }
  // "Completed" is how GitHub records a fix, including closing through a merged pull request.
  const actor=payload.sender?.login
  await db.batch(issueStatusStatements(db,issue.id,status,null,typeof actor==='string'&&GITHUB_LOGIN.test(actor)?actor:null,delivery,payload.issue?.state_reason==='completed'))
  return { ok: true, handled: true }
}
