import { throttle } from './auth'
import { githubConfig, githubIssueReplies } from './github'
import type { Database, Env } from './platform'
import { HttpError, response } from './security'

/** A public read of an already published, module-scoped report; never a general GitHub proxy. */
export async function publicIssueReplies(request: Request, env: Env, db: Database): Promise<Response | null> {
  const url = new URL(request.url)
  const match = url.pathname.match(/^\/api\/modules\/([a-z0-9-]+)\/issues\/([a-zA-Z0-9-]+)\/replies$/)
  if (!match || request.method !== 'GET') return null
  const page = Number(url.searchParams.get('page') ?? 0)
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) throw new HttpError(400, 'Choose a valid reply page.')
  const issue = await db.prepare('SELECT github_number FROM issues WHERE id=? AND module_id=? AND public_json IS NOT NULL AND github_url IS NOT NULL AND github_number IS NOT NULL').bind(match[2], match[1]).first<{ github_number: number }>()
  if (!issue || !Number.isSafeInteger(issue.github_number) || issue.github_number <= 0) throw new HttpError(404, 'Public GitHub report not found.')
  const config = githubConfig(env)
  if (!config) throw new HttpError(503, 'GitHub replies are temporarily unavailable. Open the conversation on GitHub.')
  await throttle(db, 'github-replies-ip:' + (request.headers.get('CF-Connecting-IP') ?? 'local'), 60)
  await throttle(db, 'github-replies', 1500)
  try { return response(await githubIssueReplies(config, issue.github_number, page)) }
  catch { throw new HttpError(502, 'GitHub replies could not load. Try again or open the conversation on GitHub.') }
}
