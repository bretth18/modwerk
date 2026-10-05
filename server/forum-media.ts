import type { Database, Env, Statement, User } from './platform'
import { needMember, throttle } from './auth'
import { boundedBody, detectMedia, HttpError, response } from './security'
import { FORUM_MEDIA, type ForumAttachment } from '../src/community/forum-contract'

type MediaRow = {id:string;user_id:string;post_id:string|null;kind:'image'|'audio';mime:string;bytes:number;object_key:string;post_hidden:number|null;thread_hidden:number|null}
const notFound = () => new HttpError(404,'File not found.')
// One satisfiable "bytes=" range; anything else is ignored and the whole file is sent. Safari needs ranges to play audio.
function byteRange(header: string|null, size: number) {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? Number(match[1]) : Math.max(size - Number(match[2]), 0)
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  if (start >= size || start > end || (!match[1] && !Number(match[2]))) return 'unsatisfiable' as const
  return { offset: start, length: end - start + 1 }
}
/** Upload, serve and remove forum attachments. Runs before the JSON forum routes because uploads are raw files. */
export async function forumMedia(request: Request, env: Env, db: Database, user: User|null, admin: boolean): Promise<Response|null> {
  const path = new URL(request.url).pathname
  if (path === '/api/forum/media' && request.method === 'POST') {
    const member = needMember(user)
    if (!env.MEDIA) throw new HttpError(503,'Images and sound clips are not available yet.')
    await throttle(db,'forum-media:'+member.id,FORUM_MEDIA.dailyFiles,86400)
    await throttle(db,'forum-media-ip:'+(request.headers.get('CF-Connecting-IP')??'local'),FORUM_MEDIA.dailyFiles*2,86400)
    const bytes = await boundedBody(request,FORUM_MEDIA.maxAudioBytes)
    let detected: ReturnType<typeof detectMedia>
    try { detected = detectMedia(bytes,'') } catch { throw new HttpError(415,'Attach PNG, JPEG or WebP images, or WAV, MP3 or Ogg sound clips.') }
    if (detected.kind === 'image' && bytes.byteLength > FORUM_MEDIA.maxImageBytes) throw new HttpError(413,'Images can be up to 5 MB.')
    const used = await db.prepare("SELECT COALESCE(SUM(bytes),0) AS bytes FROM forum_media WHERE user_id=? AND created_at>datetime('now','-1 day')").bind(member.id).first<{bytes:number}>()
    if ((used?.bytes ?? 0) + bytes.byteLength > FORUM_MEDIA.dailyBytes) throw new HttpError(429,'You have reached today’s upload allowance. Please try again tomorrow.')
    const id = crypto.randomUUID(), key = 'forum/' + id
    // The row comes first so an object in the bucket always has a row the hourly cleanup can find.
    await db.prepare('INSERT INTO forum_media(id,user_id,kind,mime,bytes,object_key) VALUES(?,?,?,?,?,?)').bind(id,member.id,detected.kind,detected.mime,bytes.byteLength,key).run()
    try { await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:detected.mime}}) }
    catch { await db.prepare('DELETE FROM forum_media WHERE id=?').bind(id).run(); throw new HttpError(502,'The file could not be stored. Please try again.') }
    return response({id,kind:detected.kind,mime:detected.mime,bytes:bytes.byteLength},201)
  }
  const match = path.match(/^\/api\/forum\/media\/([a-f0-9-]{36})$/)
  if (!match) return null
  if (request.method === 'GET') {
    const item = await db.prepare('SELECT m.*,p.hidden AS post_hidden,t.hidden AS thread_hidden FROM forum_media m JOIN forum_posts p ON p.id=m.post_id JOIN forum_threads t ON t.id=p.thread_id WHERE m.id=? AND m.removed=0').bind(match[1]).first<MediaRow>()
    const visible = !!item && !item.post_hidden && !item.thread_hidden
    if (!item || (!visible && !admin) || !env.MEDIA) throw notFound()
    const range = byteRange(request.headers.get('Range'),item.bytes)
    const headers = new Headers({'Content-Type':item.mime,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':'inline','Cross-Origin-Resource-Policy':'cross-origin','Cache-Control':visible?'public, max-age=300':'private, no-store'})
    if (range === 'unsatisfiable') { headers.set('Content-Range','bytes */'+item.bytes); return new Response(null,{status:416,headers}) }
    const object = await env.MEDIA.get(item.object_key,range?{range}:undefined)
    if (!object) throw notFound()
    if (range) headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${item.bytes}`)
    return new Response(object.body,{status:range?206:200,headers})
  }
  if (request.method === 'DELETE') {
    const member = needMember(user)
    const removed = await db.prepare('UPDATE forum_media SET removed=1 WHERE id=? AND user_id=? AND removed=0 RETURNING id').bind(match[1],member.id).first()
    if (!removed) throw notFound()
    return response({ok:true})
  }
  return null
}
/** Validates a post's attachments: the author's own uploads, not yet used. The statements bind them once postId exists. */
export async function attachMedia(db: Database, memberId: string, postId: string, value: unknown): Promise<Statement[]> {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > FORUM_MEDIA.perPost) throw new HttpError(400,`Attach up to ${FORUM_MEDIA.perPost} images or sound clips.`)
  const items = value.map(item => {
    const entry = item as Record<string,unknown>
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !/^[a-f0-9-]{36}$/.test(entry.id) || (entry.caption !== undefined && typeof entry.caption !== 'string')) throw new HttpError(400,'An attachment is not valid.')
    const caption = String(entry.caption ?? '').trim()
    if (caption.length > FORUM_MEDIA.captionLength) throw new HttpError(400,`Descriptions can be up to ${FORUM_MEDIA.captionLength} characters.`)
    return { id: entry.id, caption }
  })
  if (new Set(items.map(item => item.id)).size !== items.length) throw new HttpError(400,'Each file can be attached once.')
  if (!items.length) return []
  const owned = await db.prepare(`SELECT COUNT(*) AS count FROM forum_media WHERE id IN (${items.map(() => '?').join(',')}) AND user_id=? AND post_id IS NULL AND removed=0`).bind(...items.map(item => item.id),memberId).first<{count:number}>()
  if (owned?.count !== items.length) throw new HttpError(400,'An attachment is missing or already used. Upload it again.')
  return items.map((item,position) => db.prepare('UPDATE forum_media SET post_id=?,caption=?,position=? WHERE id=? AND user_id=? AND post_id IS NULL AND removed=0 AND EXISTS(SELECT 1 FROM forum_posts WHERE id=?)').bind(postId,item.caption,position,item.id,memberId,postId))
}
/** Attachments of the given posts, in the order their author chose. */
export async function postAttachments(db: Database, postIds: string[]) {
  const byPost = new Map<string,ForumAttachment[]>()
  if (!postIds.length) return byPost
  const rows = (await db.prepare(`SELECT id,post_id,kind,caption FROM forum_media WHERE removed=0 AND post_id IN (${postIds.map(() => '?').join(',')}) ORDER BY position,created_at`).bind(...postIds).all<ForumAttachment & {post_id:string}>()).results
  for (const {post_id, ...item} of rows) byPost.set(post_id,[...byPost.get(post_id) ?? [],item])
  return byPost
}
/** Hourly: purge removed files and uploads never attached to a post within a day. */
export async function cleanupForumMedia(env: Env) {
  if (!env.DB || !env.MEDIA) return
  const rows = (await env.DB.prepare("SELECT id,object_key FROM forum_media WHERE removed=1 OR (post_id IS NULL AND created_at<=datetime('now','-1 day')) LIMIT 200").all<{id:string;object_key:string}>()).results
  for (const row of rows) await env.MEDIA.delete(row.object_key)
  if (rows.length) await env.DB.batch(rows.map(row => env.DB!.prepare('DELETE FROM forum_media WHERE id=?').bind(row.id)))
}
