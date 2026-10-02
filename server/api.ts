import { recordUsage, recordModuleDownload, usageStatistics } from './usage'
import { moduleStatistics } from './module-statistics'
import recipes from '../src/catalog/module-sets.json'
import type { Database, Env, Media, User } from './platform'
import { ADMIN_ACTOR, authentication, currentUser, guest, isAdmin, throttle } from './auth'
import { checkOrigin, HttpError, jsonBody, required, response } from './security'
import { MODULES } from '../src/catalog/modules'

function needUser(user: User | null): User { if (!user) throw new HttpError(401,'No guest session is saved on this device.'); return user }
async function knownModule(db: Database, id: string) {
  if (MODULES.some(module => module.id === id)||recipes.some(recipe=>'remix-'+recipe.id===id)) return
  if (!await db.prepare("SELECT submission_id FROM module_publications WHERE module_id=?").bind(id).first()) throw new HttpError(404,'Module not found.')
}
export async function handleApi(request: Request, env: Env): Promise<Response> {
  try {
    checkOrigin(request,env)
    const url = new URL(request.url), path = url.pathname
    const auth = await authentication(request,env,path)
    if (auth) return auth
    if (/^\/api\/(submissions|review|repository)(?:\/|$)/.test(path)) throw new HttpError(410,'Module contributions and updates are accepted through GitHub pull requests only.')
    if (/^\/api\/configurations(?:\/|$)/.test(path)) throw new HttpError(410,'Configurations are saved on your device. Use Export to copy one to another device.')
    const db = env.DB
    if (!db) throw new HttpError(503,'Community services are not connected yet. Your device workspace still works.')
    if (path === '/api/usage/events' && request.method === 'POST') return await recordUsage(request,env,db)
    if (path === '/api/usage/module-downloads' && request.method === 'POST') return await recordModuleDownload(request,env,db)
    const user = await currentUser(request,db)
    const admin = await isAdmin(request,env,db)
    let match: RegExpMatchArray | null
    if ((match = path.match(/^\/api\/media\/([^/]+)$/)) && request.method === 'GET') {
      const item = await db.prepare('SELECT m.*,s.status,s.owner_id,p.submission_id AS published FROM media m JOIN submissions s ON s.id=m.submission_id LEFT JOIN module_publications p ON p.submission_id=s.id WHERE m.id=?').bind(match[1]).first<Media & {status:string;owner_id:string;published:string|null}>()
      if (!item || (!item.published && !admin && item.owner_id !== user?.id)) throw new HttpError(404,'Media not found.')
      const object = await env.MEDIA?.get(item.object_key)
      if (!object) throw new HttpError(404,'Media not found.')
      return new Response(object.body,{headers:{'Content-Type':item.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox"}})
    }
    if (path === '/api/catalog' && request.method === 'GET') return response((await db.prepare("SELECT s.module_id,s.title,s.repository_url,s.description,s.usage,s.resource_notes,s.test_report_url,s.reviewed_at,(SELECT strftime('%Y-%m-%dT%H:%M:%SZ', MIN(first.reviewed_at)) FROM submissions first WHERE first.module_id=s.module_id AND first.status='approved') AS added_at,u.github_login AS author FROM module_publications p JOIN submissions s ON s.id=p.submission_id JOIN users u ON u.id=s.owner_id ORDER BY s.reviewed_at DESC").all()).results)
    if ((match = path.match(/^\/api\/modules\/([a-z0-9-]+)$/)) && request.method === 'GET') {
      await knownModule(db,match[1])
      const comments = (await db.prepare('SELECT c.id,c.body,c.created_at,u.display_name AS author,c.user_id FROM comments c JOIN users u ON u.id=c.user_id WHERE c.module_id=? ORDER BY c.created_at DESC LIMIT 100').bind(match[1]).all<{id:string;body:string;created_at:string;author:string;user_id:string}>()).results.map(comment => ({...comment,user_id:undefined,canDelete:admin || comment.user_id === user?.id}))
      const ratings = await db.prepare('SELECT AVG(value) AS average,COUNT(*) AS count FROM ratings WHERE module_id=?').bind(match[1]).first()
      const ownRating = user ? await db.prepare('SELECT value FROM ratings WHERE module_id=? AND user_id=?').bind(match[1],user.id).first<{value:number}>() : null
      const media = (await db.prepare("SELECT m.id,m.kind,m.caption,m.capture_type FROM media m JOIN module_publications p ON p.submission_id=m.submission_id WHERE p.module_id=?").bind(match[1]).all()).results
      const likes=await db.prepare('SELECT COUNT(*) AS count FROM likes WHERE module_id=?').bind(match[1]).first<{count:number}>()
      const liked=!!(user&&await db.prepare('SELECT user_id FROM likes WHERE module_id=? AND user_id=?').bind(match[1],user.id).first())
      const downloads=(await db.prepare('SELECT downloads FROM module_downloads WHERE module_id=?').bind(match[1]).first<{downloads:number}>())?.downloads??0
      const downloadsStarted=(await db.prepare("SELECT value FROM module_download_meta WHERE key='collection_started'").first<{value:string}>())?.value??null
      return response({comments,ratings,ownRating:ownRating?.value ?? 0,media,likes:likes?.count??0,liked,downloads,downloadsStarted})
    }
    if ((match = path.match(/^\/api\/modules\/([a-z0-9-]+)\/(comments|rating|like)$/)) && request.method === 'POST') {
      await knownModule(db,match[1])
      const body = await jsonBody(request)
      await throttle(db,'community-ip:'+(request.headers.get('CF-Connecting-IP')??'local'),30)
      if(match[2]==='comments')required(body.body,'Comment',2000)
      else if(match[2]==='rating'&&(!Number.isInteger(body.value)||Number(body.value)<1||Number(body.value)>5))throw new HttpError(400,'Choose a rating from 1 to 5.')
      const visitor=await guest(request,env,db,typeof body.displayName==='string'&&body.displayName.trim()?required(body.displayName,'Display name',60):'Guest'),owner=visitor.user
      await throttle(db,'community:' + owner.id,30)
      if (match[2] === 'comments') { await db.prepare('INSERT INTO comments(id,module_id,user_id,body) VALUES(?,?,?,?)').bind(crypto.randomUUID(),match[1],owner.id,required(body.body,'Comment',2000)).run() }
      else if(match[2]==='like'){if(typeof body.liked!=='boolean')throw new HttpError(400,'Choose liked or unliked.');if(body.liked)await db.prepare('INSERT INTO likes(module_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(match[1],owner.id).run();else await db.prepare('DELETE FROM likes WHERE module_id=? AND user_id=?').bind(match[1],owner.id).run()}
      else { const rating = Number(body.value); if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400,'Choose a rating from 1 to 5.'); await db.prepare('INSERT INTO ratings(module_id,user_id,value) VALUES(?,?,?) ON CONFLICT(module_id,user_id) DO UPDATE SET value=excluded.value').bind(match[1],owner.id,rating).run() }
      const result=response({ok:true});if(visitor.cookie)result.headers.append('Set-Cookie',visitor.cookie);if(visitor.sessionToken)result.headers.set('X-Octamod-Session',visitor.sessionToken);return result
    }
    if ((match = path.match(/^\/api\/comments\/([^/]+)$/)) && request.method === 'DELETE') {
      if (admin) await db.prepare('DELETE FROM comments WHERE id=?').bind(match[1]).run()
      else await db.prepare('DELETE FROM comments WHERE id=? AND user_id=?').bind(match[1],needUser(user).id).run()
      return response({ok:true})
    }
    if ((match=path.match(/^\/api\/modules\/([a-z0-9-]+)\/issues$/)) && request.method==='POST') {
      await knownModule(db,match[1]);const body=await jsonBody(request)
      const title=required(body.title,'Issue title',160),details=required(body.body,'Issue details',4000)
      await throttle(db,'issue-ip:'+(request.headers.get('CF-Connecting-IP')??'local'),10)
      const core=MODULES.find(item=>item.id===match![1])
      const recipe=recipes.find(item=>'remix-'+item.id===match![1])
      const published=core||recipe?null:await db.prepare("SELECT u.github_login FROM module_publications p JOIN submissions s ON s.id=p.submission_id JOIN users u ON u.id=s.owner_id WHERE p.module_id=?").bind(match[1]).first<{github_login:string}>()
      const author=core?.author??recipe?.author??published?.github_login
      if(!author)throw new HttpError(400,'No author is registered for this module.')
      const visitor=await guest(request,env,db,typeof body.displayName==='string'&&body.displayName.trim()?required(body.displayName,'Display name',60):'Guest')
      await db.prepare('INSERT INTO issues(id,module_id,author_login,reporter_id,title,body) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),match[1],author,visitor.user.id,title,details).run()
      const result=response({ok:true,author},201);if(visitor.cookie)result.headers.append('Set-Cookie',visitor.cookie);if(visitor.sessionToken)result.headers.set('X-Octamod-Session',visitor.sessionToken);return result
    }
    if(path==='/api/issues/mine'&&request.method==='GET'){
      if(!user)return response([])
      return response((await db.prepare('SELECT id,module_id,author_login,title,body,status,created_at FROM issues WHERE reporter_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all()).results)
    }
    if (path.startsWith('/api/admin/')) {
      if (!admin) throw new HttpError(403,'Administrator access is required.')
      if (path === '/api/admin/statistics' && request.method === 'GET') return await usageStatistics(db,Number(url.searchParams.get('days') ?? 7))
      if (path === '/api/admin/overview' && request.method === 'GET') return response(await db.prepare("SELECT (SELECT COUNT(*) FROM submissions WHERE status='pending') AS pending,(SELECT COUNT(*) FROM module_publications) AS published,(SELECT COUNT(*) FROM comments) AS comments,(SELECT COUNT(*) FROM issues WHERE status='open') AS issues,(SELECT COALESCE(SUM(bytes),0) FROM media) AS mediaBytes").first())
      if (path === '/api/admin/history' && request.method === 'GET') return response((await db.prepare('SELECT e.id,e.module_id,e.action,e.note,e.created_at,u.display_name AS actor FROM review_events e JOIN users u ON u.id=e.actor_id ORDER BY e.rowid DESC LIMIT 100').all()).results)
      if (path === '/api/admin/issues' && request.method === 'GET') return response((await db.prepare('SELECT i.id,i.module_id,i.author_login,i.title,i.body,i.status,i.created_at,u.display_name AS reporter FROM issues i JOIN users u ON u.id=i.reporter_id ORDER BY i.created_at DESC LIMIT 200').all()).results)
      if ((match=path.match(/^\/api\/admin\/issues\/([^/]+)$/)) && request.method === 'PATCH') {
        const body=await jsonBody(request)
        if(!['open','closed'].includes(String(body.status)))throw new HttpError(400,'Choose open or closed.')
        if(!await db.prepare('UPDATE issues SET status=? WHERE id=? RETURNING id').bind(body.status,match[1]).first())throw new HttpError(404,'Issue not found.')
        return response({ok:true})
      }
      if (path === '/api/admin/comments' && request.method === 'GET') return response((await db.prepare('SELECT c.id,c.module_id,c.body,c.created_at,u.display_name AS author FROM comments c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 100').all()).results)
      if ((match=path.match(/^\/api\/admin\/modules\/([a-z0-9-]+)\/withdraw$/)) && request.method === 'POST') {
        const body=await jsonBody(request),note=required(body.note,'Withdrawal reason',2000),event=crypto.randomUUID(),id=match[1]
        const [recorded]=await db.batch([
          db.prepare("INSERT INTO review_events(id,actor_id,module_id,submission_id,action,note) SELECT ?,?,module_id,submission_id,'withdrawn',? FROM module_publications WHERE module_id=?").bind(event,ADMIN_ACTOR,note,id),
          db.prepare('DELETE FROM module_publications WHERE module_id=? AND EXISTS(SELECT 1 FROM review_events WHERE id=?)').bind(id,event),
        ])
        if (!(recorded as {meta:{changes:number}}).meta.changes) throw new HttpError(404,'Published contribution not found.')
        return response({ok:true})
      }
      throw new HttpError(404,'API route not found.')
    }
    if(path==='/api/community/summary'&&request.method==='GET')return response(await moduleStatistics(db))
    throw new HttpError(404,'API route not found.')
  } catch (error) { return response({error:error instanceof HttpError ? error.message : 'The community service could not complete this request.'},error instanceof HttpError ? error.status : 500) }
}
