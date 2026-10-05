import { sendMemberWelcomes } from './server/welcome-mail'
import { cleanupDeveloperAuth } from './server/developer-auth'
import { cleanupAccounts } from './server/accounts'
import { cleanupUsage } from './server/usage'
import { ensureModuleThreads } from './server/module-threads'
import { sendActivityDigests } from './server/activity-mail'
import { cleanupForumMedia } from './server/forum-media'
import { handleCommunity } from './server/transport'
import type { Env } from './server/platform'

export default {
  fetch(request: Request, env: Env) { return handleCommunity(request, env) },
  scheduled(event: { cron: string }, env: Env, context: { waitUntil(promise: Promise<unknown>): void }) {
    if (!env.DB) return
    if (event.cron === '*/5 * * * *') {
      context.waitUntil(sendMemberWelcomes(env, env.DB))
      return
    }
    context.waitUntil(Promise.all([cleanupUsage(env.DB), cleanupAccounts(env.DB), cleanupDeveloperAuth(env.DB), ensureModuleThreads(env.DB), sendActivityDigests(env, env.DB), cleanupForumMedia(env)]))
  },
}
