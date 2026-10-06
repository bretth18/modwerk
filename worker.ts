import { cleanupPush, startPush } from './server/push'
import { sendMemberWelcomes } from './server/welcome-mail'
import { cleanupDeveloperAuth } from './server/developer-auth'
import { cleanupAccounts } from './server/accounts'
import { cleanupUsage } from './server/usage'
import { ensureModuleThreads } from './server/module-threads'
import { sendActivityDigests } from './server/activity-mail'
import { syncModuleReleases } from './server/module-updates'
import { cleanupForumMedia } from './server/forum-media'
import { handleCommunity } from './server/transport'
import type { Env } from './server/platform'

export default {
  fetch(request: Request, env: Env, context?: { waitUntil(promise: Promise<unknown>): void }) { return handleCommunity(request, env, context) },
  scheduled(event: { cron: string }, env: Env, context: { waitUntil(promise: Promise<unknown>): void }) {
    if (!env.DB) return
    if (event.cron === '* * * * *') {
      startPush(env, context)
      return
    }
    if (event.cron === '*/5 * * * *') {
      context.waitUntil(sendMemberWelcomes(env, env.DB))
      return
    }
    const activity=syncModuleReleases(env,env.DB).catch(()=>{console.warn('Published module versions could not be checked; retrying next hour.')}).then(()=>sendActivityDigests(env,env.DB!))
    context.waitUntil(Promise.all([cleanupPush(env.DB), cleanupUsage(env.DB), cleanupAccounts(env.DB), cleanupDeveloperAuth(env.DB), ensureModuleThreads(env.DB), activity, cleanupForumMedia(env)]))
  },
}
