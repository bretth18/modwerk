export type NotificationKind = 'reply' | 'mention' | 'bug_report' | 'post_like' | 'module_comment' | 'module_rating' | 'module_like'
/** One bell entry. Content fields come from public posts and comments; the entry itself is private to its recipient. */
export type NotificationItem = { id: string; kind: NotificationKind; seen: boolean; created_at: string; thread_id: string | null; post_id: string | null; module_id: string | null; actor: string | null; actorOfficial: boolean; title: string | null; excerpt: string | null; rating: number | null }
export type NotificationPreferences = { emailEnabled: boolean; frequency: 'hours' | 'daily'; replies: boolean; likes: boolean; modules: boolean; bugs: boolean; emailAvailable: boolean }
/** Which email setting covers each kind. Module likes count as module activity; likes on posts have their own switch. */
export const EMAIL_SETTING: Record<NotificationKind, 'replies' | 'likes' | 'modules' | 'bugs'> = { reply: 'replies', mention: 'replies', post_like: 'likes', module_comment: 'modules', module_rating: 'modules', module_like: 'modules', bug_report: 'bugs' }
/** Digest spacing per frequency; the hourly job sends when the member's last digest is older than this. */
export const DIGEST_HOURS = { hours: 6, daily: 24 } as const
