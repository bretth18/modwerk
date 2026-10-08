import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fetchOwnerApproval, releaseIdentity } from '../src/release/approval.ts'
import { ACTIONS_BOT_ID, authorRequestedRelease } from '../src/release/author-updates.ts'
import { inspectAuthorUpdate } from './author-update-git.mjs'
import { githubApi, pages, authorChecks } from './author-release-api.mjs'

/** Re-fetch GitHub evidence independently of compiler output and the merge job. */
export async function fetchReleaseApproval(repository, commit, ownerId, token = '', attempts = 7, retryMs = 15000, options = {}) {
  releaseIdentity(repository, commit, ownerId)
  const api = githubApi(repository, token), root = options.root ?? fileURLToPath(new URL('../', import.meta.url))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await fetchOwnerApproval(repository, commit, ownerId, token, 1, 0) }
    catch (error) { if (!error.message.startsWith('No owner-merged PR')) throw error }
    const pulls = await pages(api, '/commits/' + commit + '/pulls')
    for (const item of pulls) {
      const pr = await api('/pulls/' + item.number)
      if (pr.merged !== true || pr.state !== 'closed' || pr.base?.ref !== 'main' || pr.base.repo.full_name !== repository || pr.merged_by?.id !== ACTIONS_BOT_ID || pr.merged_by.login !== 'github-actions[bot]' || !authorRequestedRelease(pr.body)) continue
      const events = await pages(api, '/issues/' + pr.number + '/events'), merges = events.filter(event => event.event === 'merged')
      if (merges.length !== 1 || merges[0].commit_id !== commit || merges[0].actor?.id !== ACTIONS_BOT_ID || pr.merge_commit_sha && pr.merge_commit_sha !== commit) continue
      const parents = git('rev-list', '--parents', '-n', '1', commit).split(' ')
      if (parents.length !== 3 || parents[2] !== pr.head.sha) continue
      const scope = inspectAuthorUpdate(root, parents[1], parents[2], pr.user)
      const runId = await authorChecks(api, repository, parents[2], parents[1], scope)
      return { kind: 'github-pr-merge', repository, sourceCommit: commit, baseRef: 'main', pullRequest: pr.number,
        mergedBy: pr.merged_by.login, mergedById: ACTIONS_BOT_ID, moduleApproverId: ownerId, mergedAt: pr.merged_at,
        authorization: 'module-author', authorId: pr.user.id, modules: scope.modules, checkedHead: parents[2], checkedBase: parents[1], checkRunId: runId }
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, retryMs))
  }
  throw new Error('No owner or authorized module-author PR approves this exact main commit; keep the previous publication.')
}
