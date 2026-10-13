import { createRemoteJWKSet, customFetch, jwtVerify } from 'jose'
import type { Database, Env } from './platform'
import { throttle } from './auth'
import { HttpError, jsonBody, response } from './security'
import { publishedModuleReleases, recordModuleReleases } from './module-updates'

const ISSUER = 'https://token.actions.githubusercontent.com'
const githubKeys = createRemoteJWKSet(new URL(ISSUER + '/.well-known/jwks'), {
  [customFetch]: (url, options) => fetch(url, options),
})

/** Only the reviewed main-branch Pages deployment job can synchronize a publication. */
async function releaseWorkflow(request: Request, env: Env) {
  const repository = env.GITHUB_REPOSITORY?.trim() || 'repeat98/modwerk'
  const repositoryId = env.RELEASE_REPOSITORY_ID, ownerId = env.RELEASE_REPOSITORY_OWNER_ID
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !repositoryId || !ownerId || !/^\d+$/.test(repositoryId) || !/^\d+$/.test(ownerId) || !env.AUTH_BASE_URL) throw new HttpError(503, 'Release synchronization is not configured.')
  const audience = new URL('/api/module-releases/sync', env.AUTH_BASE_URL)
  if (audience.protocol !== 'https:') throw new HttpError(503, 'Release synchronization requires HTTPS.')
  const authorization = request.headers.get('Authorization') ?? ''
  if (authorization.length > 8192 || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(authorization)) throw new HttpError(403, 'A signed Pages deployment is required.')
  try {
    const { payload } = await jwtVerify(authorization.slice(7), githubKeys, {
      issuer: ISSUER, audience: audience.href, algorithms: ['RS256'], maxTokenAge: '10m', clockTolerance: 5,
      requiredClaims: ['sub', 'exp', 'iat', 'nbf', 'repository', 'repository_id', 'repository_owner_id', 'workflow_ref', 'ref', 'environment', 'event_name', 'run_id', 'sha'],
    })
    const [owner, name] = repository.split('/')
    const subjects = [
      'repo:' + repository + ':environment:github-pages',
      'repo:' + owner + '@' + ownerId + '/' + name + '@' + repositoryId + ':environment:github-pages',
    ]
    if (payload.repository !== repository || payload.repository_id !== repositoryId || payload.repository_owner_id !== ownerId ||
      payload.workflow_ref !== repository + '/.github/workflows/pages.yml@refs/heads/main' || payload.ref !== 'refs/heads/main' ||
      payload.environment !== 'github-pages' || !subjects.includes(String(payload.sub)) ||
      !['push', 'workflow_dispatch', 'schedule'].includes(String(payload.event_name)) ||
      typeof payload.run_id !== 'string' || !/^\d+$/.test(payload.run_id) || typeof payload.sha !== 'string' || !/^[a-f0-9]{40}$/.test(payload.sha)) throw new Error('Untrusted publication identity')
    return payload.run_id
  } catch {
    // Token, provider response and claims must never enter logs or public errors.
    throw new HttpError(403, 'A signed Pages deployment is required.')
  }
}

/** Queue the existing follower events after publication; mail retains its digest schedule. */
export async function publishedReleaseRoute(request: Request, env: Env, db: Database) {
  if (request.method !== 'POST') throw new HttpError(405, 'Use POST to synchronize a published release.')
  const run = await releaseWorkflow(request, env)
  const body = await jsonBody(request)
  if (typeof body.inventorySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(body.inventorySha256) || Object.keys(body).some(key => key !== 'inventorySha256')) throw new HttpError(400, 'Provide the published release inventory hash.')
  await throttle(db, 'module-release-sync:' + run, 50)
  const releases = await publishedModuleReleases(env, body.inventorySha256)
  return response(await recordModuleReleases(db, releases))
}
