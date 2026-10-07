import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { FORUM_CATEGORIES } from './forum-contract'
import { testServer } from './test-server'

const databases:DatabaseSync[]=[]
const sent:{to:string[];text:string}[]=[]
const password='forum extension test passphrase'
beforeEach(()=>{sent.length=0;vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{sent.push(JSON.parse(String(options.body)));return Response.json({id:crypto.randomUUID()})}))})
afterEach(()=>{vi.unstubAllGlobals();for(const db of databases.splice(0))db.close()})
async function fixture(){
  const server=await testServer();databases.push(server.db)
  async function member(username:string){
    const email=username+'@example.test'
    expect((await server.call('/auth/register','POST',{rulesVersion:COMMUNITY_RULES_VERSION,username,email,password})).status).toBe(202)
    const token=[...sent].reverse().find(item=>item.to[0]===email)!.text.match(/#account\/verify\/([^\s]+)/)![1]
    expect((await server.call('/auth/verify','POST',{token,password})).status).toBe(200)
    const login=await server.call('/auth/login','POST',{email,password})
    expect(login.status).toBe(200)
    return {token:login.headers.get('X-Octamod-Session')!,id:String(server.db.prepare('SELECT id FROM users WHERE username=?').get(username)!.id),email}
  }
  async function admin(){return (await(await server.call('/auth/admin','POST',{key:'e'.repeat(64)})).json()).token as string}
  return {...server,member,admin}
}
describe('forum organization',()=>{
  it('adds categories without rewriting existing discussions or breaking foreign keys',()=>{
    const db=new DatabaseSync(':memory:');databases.push(db)
    for(const name of readdirSync(new URL('../../migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')&&!name.startsWith('0027')).sort())db.exec(readFileSync(new URL('../../migrations/'+name,import.meta.url),'utf8'))
    db.exec("INSERT INTO users(id,display_name) VALUES('legacy','Legacy'); INSERT INTO forum_threads(id,user_id,title,category,machine) VALUES('old-thread','legacy','Old thread','configs','octatrack'); INSERT INTO forum_posts(id,thread_id,user_id,body) VALUES('old-post','old-thread','legacy','Existing text'); INSERT INTO forum_follows(thread_id,user_id) VALUES('old-thread','legacy'); INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,forum_thread_id) VALUES('old-issue','miniverb','legacy','legacy','Issue','Details','old-thread')")
    db.exec(readFileSync(new URL('../../migrations/0027_forum_organization.sql',import.meta.url),'utf8'))
    expect(db.prepare('SELECT category,machine,section FROM forum_threads WHERE id=?').get('old-thread')).toMatchObject({category:'configs',machine:'octatrack',section:null})
    expect(db.prepare('SELECT body FROM forum_posts WHERE id=?').get('old-post')!.body).toBe('Existing text')
    expect(db.prepare('SELECT forum_thread_id FROM issues WHERE id=?').get('old-issue')!.forum_thread_id).toBe('old-thread')
    expect(db.prepare('SELECT * FROM forum_follows').all()).toHaveLength(1)
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
  it('publishes and filters every new category and scopes category counts to visible discussions and machines',async()=>{
    const {call,member,admin}=await fixture(),owner=await member('organizer')
    for(const category of ['requests','tutorials','introductions','showcase']){
      const result=await call('/forum/threads','POST',{title:FORUM_CATEGORIES[category as keyof typeof FORUM_CATEGORIES],body:'A useful discussion',category,machine:'digitakt'},owner.token)
      expect(result.status).toBe(201)
      const {id}=await result.json()
      expect((await(await call('/forum/threads/'+id)).json()).thread.category).toBe(category)
      expect((await(await call('/forum/threads?category='+category+'&machine=digitakt')).json()).threads.map((item:{id:string})=>item.id)).toEqual([id])
    }
    const counts=await(await call('/forum/categories?machine=digitakt')).json()
    expect(counts.filter((item:{category:string})=>['requests','tutorials','introductions','showcase'].includes(item.category))).toHaveLength(4)
    const requests=(await(await call('/forum/threads?category=requests')).json()).threads
    await call('/admin/forum/threads/'+requests[0].id,'PATCH',{action:'hidden',value:true,reason:'Test hidden category'},'',await admin())
    expect((await(await call('/forum/categories?machine=digitakt')).json()).some((item:{category:string})=>item.category==='requests')).toBe(false)
    expect((await call('/forum/categories?machine=unknown')).status).toBe(400)
    expect((await call('/forum/threads?category=constructor')).status).toBe(400)
  })
  it('keeps following private and sorts new threads independently of recent replies',async()=>{
    const {call,member,db}=await fixture(),owner=await member('follower'),other=await member('starter')
    const first=await(await call('/forum/threads','POST',{title:'Older request',body:'Earlier idea',category:'requests'},owner.token)).json()
    const second=await(await call('/forum/threads','POST',{title:'Newer request',body:'Later idea',category:'requests'},other.token)).json()
    db.prepare('UPDATE forum_threads SET created_at=?,updated_at=? WHERE id=?').run('2026-10-01 10:00:00','2026-10-05 10:00:00',first.id)
    db.prepare('UPDATE forum_threads SET created_at=?,updated_at=? WHERE id=?').run('2026-10-02 10:00:00','2026-10-02 10:00:00',second.id)
    expect((await(await call('/forum/threads?category=requests')).json()).threads.map((item:{id:string})=>item.id)).toEqual([first.id,second.id])
    expect((await(await call('/forum/threads?category=requests&sort=newest')).json()).threads.map((item:{id:string})=>item.id)).toEqual([second.id,first.id])
    expect((await call('/forum/threads?following=1')).status).toBe(401)
    expect((await(await call('/forum/threads?following=1','GET',undefined,owner.token)).json()).threads.map((item:{id:string})=>item.id)).toEqual([first.id])
    expect((await call('/forum/threads?sort=arbitrary')).status).toBe(400)
  })
  it('links to the right reply page and excludes hidden posts and threads from activity',async()=>{
    const {call,member,db,admin}=await fixture(),owner=await member('replyauthor')
    const {id}=await(await call('/forum/threads','POST',{title:'A long discussion',body:'Opening post',category:'showcase',machine:'octatrack'},owner.token)).json()
    for(let index=0;index<34;index++)db.prepare('INSERT INTO forum_posts(id,thread_id,user_id,body) VALUES(?,?,?,?)').run('reply-'+index,id,owner.id,'Reply '+index)
    let recent=await(await call('/forum/recent-posts?machine=octatrack')).json()
    expect(recent[0]).toMatchObject({id:'reply-33',page:1,category:'showcase'})
    expect(JSON.stringify(recent)).not.toMatch(/user_id|email|password|token/)
    const thread=(await(await call('/forum/threads?category=showcase')).json()).threads[0]
    expect(thread).toMatchObject({last_post_id:'reply-33',last_post_page:1,last_username:'replyauthor'})
    expect((await(await call('/forum/threads/'+id+'?page='+recent[0].page)).json()).posts.some((item:{id:string})=>item.id===recent[0].id)).toBe(true)
    const key=await admin()
    await call('/admin/forum/posts/reply-33','PATCH',{action:'hidden',value:true,reason:'Hide a reply'},'',key)
    recent=await(await call('/forum/recent-posts?machine=octatrack')).json()
    expect(recent.some((item:{id:string})=>item.id==='reply-33')).toBe(false)
    await call('/admin/forum/threads/'+id,'PATCH',{action:'hidden',value:true,reason:'Hide the discussion'},'',key)
    expect(await(await call('/forum/recent-posts?machine=octatrack')).json()).toEqual([])
    expect((await call('/forum/recent-posts?machine=unknown')).status).toBe(400)
  })
  it('highlights the most liked posts and reply authors of the last 30 days and the newest members, publicly and cached',async()=>{
    const {call,member,db,admin}=await fixture(),starter=await member('starter'),helper=await member('helper'),quiet=await member('quietone'),fan=await member('fanone'),second=await member('fantwo')
    const {id}=await(await call('/forum/threads','POST',{title:'Highlight thread',body:'Opening post',category:'general'},starter.token)).json()
    const opening=db.prepare('SELECT id FROM forum_posts WHERE thread_id=? ORDER BY created_at,rowid LIMIT 1').get(id)!.id as string
    const reply=(await(await call('/forum/threads/'+id+'/replies','POST',{body:'A helpful reply'},helper.token)).json()).id as string
    const hidden=(await(await call('/forum/threads/'+id+'/replies','POST',{body:'A reply the administrator hides'},helper.token)).json()).id as string
    const earlier=await(await call('/forum/threads','POST',{title:'An old favourite',body:'Opening post from last season',category:'general'},quiet.token)).json()
    const old=(await(await call('/forum/threads/'+earlier.id+'/replies','POST',{body:'An old reply'},quiet.token)).json()).id as string
    db.prepare("UPDATE forum_posts SET created_at=datetime('now','-40 days') WHERE thread_id=?").run(earlier.id)
    db.prepare("UPDATE forum_threads SET created_at=datetime('now','-40 days'),updated_at=datetime('now','-40 days') WHERE id=?").run(earlier.id)
    for(const token of [fan.token,second.token])for(const post of [opening,reply,hidden,old])expect((await call('/forum/posts/'+post+'/react','POST',{liked:true},token)).status).toBe(200)
    expect((await call('/forum/posts/'+opening+'/react','POST',{liked:true},helper.token)).status).toBe(200)
    await call('/admin/forum/posts/'+hidden,'PATCH',{action:'hidden',value:true,reason:'Hidden for the test'},'',await admin())
    const result=await call('/forum/highlights')
    expect(result.status).toBe(200)
    expect(result.headers.get('Cache-Control')).toBe('public, max-age=300')
    const body=await result.json()
    // The hidden reply and the post older than 30 days are left out; the opening post leads with three likes.
    expect(body.topPosts.map((item:{id:string;likes:number})=>[item.id,item.likes])).toEqual([[opening,3],[reply,2]])
    expect(body.topPosts[0]).toMatchObject({thread_id:id,title:'Highlight thread',username:'starter',category:'general',page:0})
    // Likes on opening posts do not count towards the most liked replies.
    expect(body.topMembers).toEqual([{username:'helper',avatar:null,likes:2}])
    expect(body.newMembers.map((item:{username:string})=>item.username)).toEqual(['fantwo','fanone','quietone','helper','starter'])
    expect(JSON.stringify(body)).not.toMatch(/user_id|email|password|token|@/)
    // Suspended members disappear from every list, and an unverified sign-up is not a new member yet.
    db.prepare('UPDATE users SET suspended=1 WHERE id=?').run(helper.id)
    db.prepare('UPDATE users SET email_verified=0 WHERE id=?').run(second.id)
    const after=await(await call('/forum/highlights')).json()
    expect(after.topPosts.map((item:{id:string})=>item.id)).toEqual([opening])
    expect(after.topMembers).toEqual([])
    expect(after.newMembers.map((item:{username:string})=>item.username)).toEqual(['fanone','quietone','starter'])
  })
})
describe('Shoutbox 8',()=>{
  it('allows public reading, requires verified membership and trusted origin, and bounds messages',async()=>{
    const {call,member,db}=await fixture(),owner=await member('chatmember')
    expect((await call('/forum/shouts')).status).toBe(200)
    expect((await call('/forum/shouts','POST',{body:'Hello'})).status).toBe(401)
    expect((await call('/forum/shouts','POST',{body:'Hello'},owner.token,'','https://evil.test')).status).toBe(403)
    for(const body of ['', '  ', 'x'.repeat(601),123])expect((await call('/forum/shouts','POST',{body},owner.token)).status).toBe(400)
    const result=await call('/forum/shouts','POST',{body:'  Hello, community!  '},owner.token)
    expect(result.status).toBe(201)
    const listed=await(await call('/forum/shouts')).json()
    expect(listed.messages[0]).toMatchObject({body:'Hello, community!',username:'chatmember',canEdit:false})
    expect((await(await call('/forum/shouts','GET',undefined,owner.token)).json()).messages[0].canEdit).toBe(true)
    expect(JSON.stringify(listed)).not.toMatch(/user_id|email|password|token/)
    db.prepare('UPDATE users SET email_verified=0 WHERE id=?').run(owner.id)
    db.prepare('UPDATE auth_users SET emailVerified=0 WHERE id=?').run(owner.id)
    expect((await call('/forum/shouts','POST',{body:'Unverified'},owner.token)).status).toBe(401)
    expect((await call('/forum/shouts?page=-1')).status).toBe(400)
  })
  it('protects ownership, queues reports, and lets administrators hide and restore messages with history',async()=>{
    const {call,member,admin,db}=await fixture(),owner=await member('chatowner'),reporter=await member('chatreporter')
    const {id}=await(await call('/forum/shouts','POST',{body:'First message'},owner.token)).json()
    expect((await call('/forum/shouts/'+id,'PATCH',{body:'Hijacked'},reporter.token)).status).toBe(403)
    expect((await call('/forum/shouts/'+id,'DELETE',undefined,reporter.token)).status).toBe(403)
    expect((await call('/forum/shouts/'+id,'PATCH',{body:'Edited message'},owner.token)).status).toBe(200)
    const edited=(await(await call('/forum/shouts')).json()).messages[0]
    expect(edited.edited_at).toBeTruthy()
    for(let index=0;index<2;index++)expect((await call('/forum/shouts/'+id+'/report','POST',{reason:'Review this message'},reporter.token)).status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS count FROM forum_shout_reports').get()!.count).toBe(1)
    expect((await call('/admin/forum/reports','GET',undefined,reporter.token)).status).toBe(403)
    const key=await admin(),reports=await(await call('/admin/forum/reports','GET',undefined,'',key)).json()
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({kind:'shout',post_id:id,thread_id:null})
    expect((await call('/admin/forum/shouts/'+id,'PATCH',{action:'hidden',value:true,reason:'Hide reported message'},reporter.token)).status).toBe(403)
    expect((await call('/admin/forum/shouts/'+id,'PATCH',{action:'hidden',value:true,reason:'Hide reported message'},'',key)).status).toBe(200)
    expect((await(await call('/forum/shouts')).json()).messages).toEqual([])
    expect((await(await call('/forum/shouts','GET',undefined,'',key)).json()).messages[0].hidden).toBe(1)
    expect((await call('/forum/shouts/'+id,'PATCH',{body:'Bypass hidden state'},owner.token)).status).toBe(404)
    await call('/admin/forum/shouts/'+id,'PATCH',{action:'hidden',value:false,reason:'Restore message'},'',key)
    await call('/admin/forum/shout-reports/'+reports[0].id,'PATCH',{action:'resolved',value:true,reason:'Review complete'},'',key)
    expect((await(await call('/admin/forum/history','GET',undefined,'',key)).json()).filter((item:{target:string})=>item.target===id)).toHaveLength(2)
    expect((await call('/forum/shouts/'+id,'DELETE',undefined,owner.token)).status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS count FROM forum_shout_reports').get()!.count).toBe(0)
  })
  it('caps sending bursts and keeps chat separate from thread notifications',async()=>{
    const {call,member,db}=await fixture(),owner=await member('chatter')
    for(let index=0;index<6;index++)expect((await call('/forum/shouts','POST',{body:'Message '+index},owner.token)).status).toBe(201)
    expect((await call('/forum/shouts','POST',{body:'One too many'},owner.token)).status).toBe(429)
    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id=?').get(owner.id)!.count).toBe(0)
    expect((await call('/forum/threads','POST',{title:'Still able to discuss',body:'A slower conversation',category:'general'},owner.token)).status).toBe(201)
  })
  it('notifies mentioned members like a forum post, never the author, and hides the entry with the message',async()=>{
    const {call,member,admin,db}=await fixture(),owner=await member('chatcaller'),called=await member('chatcalled'),other=await member('chatquiet')
    const {id}=await(await call('/forum/shouts','POST',{body:'Hey @chatcalled and @ChatCaller, look at this'},owner.token)).json()
    const bell=async(token:string)=>(await(await call('/notifications','GET',undefined,token)).json()).items as {kind:string;thread_id:string|null;actor:string;excerpt:string}[]
    expect(await bell(called.token)).toEqual([expect.objectContaining({kind:'mention',thread_id:null,actor:'chatcaller',excerpt:'Hey @chatcalled and @ChatCaller, look at this'})])
    expect(await bell(owner.token)).toEqual([])
    expect(await bell(other.token)).toEqual([])
    expect((await(await call('/notifications/unread','GET',undefined,called.token)).json()).unread).toBe(1)
    const key=await admin()
    await call('/admin/forum/shouts/'+id,'PATCH',{action:'hidden',value:true,reason:'Hide it'},'',key)
    expect(await bell(called.token)).toEqual([])
    await call('/admin/forum/shouts/'+id,'PATCH',{action:'hidden',value:false,reason:'Restore it'},'',key)
    expect(await bell(called.token)).toHaveLength(1)
    expect((await call('/forum/shouts/'+id,'DELETE',undefined,owner.token)).status).toBe(200)
    expect(await bell(called.token)).toEqual([])
    const names=Array.from({length:12},(_,index)=>'crowd'+index)
    for(const name of names)db.prepare("INSERT INTO users(id,display_name,username,email_verified) VALUES(?,?,?,1)").run('user-'+name,name,name)
    const crowd=await call('/forum/shouts','POST',{body:names.map(name=>'@'+name).join(' ')},owner.token)
    expect(crowd.status).toBe(201)
    expect(db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE kind='mention' AND comment_id=?").get((await crowd.json()).id)!.count).toBe(10)
  })
  it('paginates compact and archive views, exports only owned chat data, and removes messages on account deletion',async()=>{
    const {call,member,db}=await fixture(),owner=await member('chatprivacy'),other=await member('chatother')
    for(let index=0;index<35;index++)db.prepare('INSERT INTO forum_shouts(id,user_id,body) VALUES(?,?,?)').run('chat-'+index,index===0?other.id:owner.id,index===0?'Other member text':'Own message '+index)
    expect((await(await call('/forum/shouts?compact=1')).json()).messages).toHaveLength(8)
    const first=await(await call('/forum/shouts')).json(),second=await(await call('/forum/shouts?page=1')).json()
    expect(first.messages).toHaveLength(30);expect(first.hasMore).toBe(true);expect(second.messages).toHaveLength(5);expect(second.hasMore).toBe(false)
    expect(new Set([...first.messages,...second.messages].map(item=>item.id)).size).toBe(35)
    await call('/forum/shouts/chat-34/report','POST',{reason:'Other member report'},other.token)
    const exported=await(await call('/auth/data-export','POST',{password},owner.token)).json()
    expect(exported.data.shoutboxMessages).toHaveLength(34)
    expect(exported.data.shoutboxReports).toEqual([])
    expect(JSON.stringify(exported)).not.toContain('Other member text')
    expect((await call('/auth/account','DELETE',{confirm:'DELETE',password},owner.token)).status).toBe(200)
    expect((await(await call('/forum/shouts')).json()).messages).toHaveLength(1)
    expect(db.prepare('SELECT COUNT(*) AS count FROM forum_shout_reports').get()!.count).toBe(0)
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
})
