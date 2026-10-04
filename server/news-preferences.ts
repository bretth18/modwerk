import type { Database, User } from './platform'
import { HttpError, jsonBody, response } from './security'

export const NEWS_CONSENT_VERSION = 'modwerk-news-2026-10-04'

export async function initializeNewsPreference(db: Database, userId: string, enabled: boolean) {
  // Duplicate signup returns an opaque user; it must not claim or reset consent.
  await db.prepare('INSERT INTO account_news_preferences(user_id,enabled,consent_version,changed_at) SELECT id,?,?,? FROM auth_users WHERE id=? ON CONFLICT(user_id) DO NOTHING')
    .bind(enabled ? 1 : 0, enabled ? NEWS_CONSENT_VERSION : null, new Date().toISOString(), userId).run()
}

export async function saveNewsPreference(db: Database, userId: string, enabled: boolean) {
  await db.prepare('INSERT INTO account_news_preferences(user_id,enabled,consent_version,changed_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,consent_version=excluded.consent_version,changed_at=excluded.changed_at WHERE account_news_preferences.enabled!=excluded.enabled')
    .bind(userId, enabled ? 1 : 0, enabled ? NEWS_CONSENT_VERSION : null, new Date().toISOString()).run()
}

export async function newsPreferences(request: Request, db: Database, user: User | null): Promise<Response | null> {
  if (new URL(request.url).pathname !== '/api/auth/news') return null
  if (!user?.email_verified || user.suspended) throw new HttpError(401, 'Sign in to manage news emails.')
  if (request.method === 'PATCH') {
    const body = await jsonBody(request)
    if (typeof body.enabled !== 'boolean') throw new HttpError(400, 'Choose whether to receive news emails.')
    await saveNewsPreference(db, user.id, body.enabled)
  } else if (request.method !== 'GET') throw new HttpError(405, 'This account action is not supported.')
  const preference = await db.prepare('SELECT enabled,changed_at FROM account_news_preferences WHERE user_id=?').bind(user.id).first<{enabled:number;changed_at:string}>()
  return response({ enabled: !!preference?.enabled, changedAt: preference?.changed_at ?? null })
}
