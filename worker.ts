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

const failureDetail = (reason: unknown) => reason instanceof Error ? reason.stack ?? reason.message : String(reason)

/** Runs every hourly task even when one fails, and names the failed task in Workers Logs. */
export async function runHourly(tasks: Record<string, () => Promise<unknown>>) {
  const results = await Promise.allSettled(Object.values(tasks).map(task => task()))
  const names = Object.keys(tasks), failed: string[] = []
  results.forEach((result, index) => {
    if (result.status !== 'rejected') return
    failed.push(names[index])
    console.error(`Hourly task "${names[index]}" failed: ${failureDetail(result.reason)}`)
  })
  return failed
}

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
    const db = env.DB
    const activity = () => syncModuleReleases(env, db).catch(error => { console.error(`Published module versions could not be checked; retrying next hour: ${failureDetail(error)}`) }).then(() => sendActivityDigests(env, db))
    context.waitUntil(runHourly({
      'push cleanup': () => cleanupPush(db), 'usage cleanup': () => cleanupUsage(db), 'account cleanup': () => cleanupAccounts(db),
      'developer auth cleanup': () => cleanupDeveloperAuth(db), 'module threads': () => ensureModuleThreads(db), 'activity digests': activity, 'forum media cleanup': () => cleanupForumMedia(env),
    }))
  },
}
