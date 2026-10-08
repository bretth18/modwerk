import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { authorRequestedRelease } from '../src/release/author-updates.ts'
import { inspectAuthorUpdate } from './author-update-git.mjs'
import { githubApi, pages, mergeAuthorPull } from './author-release-api.mjs'

const repository = process.env.GITHUB_REPOSITORY, api = githubApi(repository, process.env.GITHUB_TOKEN)
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')), run = event.workflow_run
if (!run || run.event !== 'pull_request' || run.conclusion !== 'success') throw new Error('Only successful PR workflow completions can request author release.')
const root = fileURLToPath(new URL('../', import.meta.url))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const pulls = await pages(api, '/pulls?state=open')
for (const candidate of pulls.filter(pr => pr.head?.sha === run.head_sha && pr.base?.ref === 'main')) {
  const pr = await api('/pulls/' + candidate.number)
  if (pr.draft || !authorRequestedRelease(pr.body) || pr.base.repo.full_name !== repository) continue
  const base = (await api('/git/ref/heads/main')).object.sha, head = pr.head.sha
  if (git('rev-parse', 'HEAD') !== base) throw new Error('Main changed before author authorization; rebase and rerun checks.')
  // Fetch objects into a private ref without checkout, credentials, npm or module execution.
  git('fetch', '--no-tags', 'https://github.com/' + repository + '.git', 'refs/pull/' + pr.number + '/head')
  if (git('rev-parse', 'FETCH_HEAD') !== head) throw new Error('Author updated the PR while it was being inspected.')
  let scope
  try { scope = inspectAuthorUpdate(root, base, head, pr.user) }
  catch (error) { console.log('PR #' + pr.number + ' needs owner review: ' + error.message); continue }
  // Expected head SHA and GitHub branch protection are enforced by the merge endpoint.
  const runId = await mergeAuthorPull(api, repository, pr.number, head, base, scope, run.id)
  console.log('Author PR #' + pr.number + ' merged after CI run ' + runId + '; site and API publication requested for ' + scope.modules.join(', ') + '.')
}
