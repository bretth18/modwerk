import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { sendActivityDigests } from '../../server/activity-mail'
import { communityModule } from './modules'
import { notificationLines } from './notification-text'
import { threadPath } from './forum-links'
import type { NotificationItem } from './notification-contract'

type Listed={id:string;votes:number;request_status:string}
const databases:DatabaseSync[]=[],sent:{to:string[];text:string}[]=[],password='feature request test passphrase'
beforeEach(()=>{sent.length=0;vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{sent.push(JSON.parse(String(options.body)));return Response.json({id:crypto.randomUUID()})}))})
afterEach(()=>{vi.unstubAllGlobals();for(const db of databases.splice(0))db.close()})
async function fixture(){
  const server=await testServer();databases.push(server.db)
  server.env.AUTH_BASE_URL='https://api.example.test/api/auth'
  async function member(username:string){
    const email=username+'@example.test'
    expect((await server.call('/auth/register','POST',{rulesVersion:COMMUNITY_RULES_VERSION,username,email,password})).status).toBe(202)
    const token=[...sent].reverse().find(item=>item.to[0]===email)!.text.match(/#account\/verify\/([^\s]+)/)![1]
    expect((await server.call('/auth/verify','POST',{token,password})).status).toBe(200)
    const login=await server.call('/auth/login','POST',{email,password})
    expect(login.status).toBe(200)
    return {token:login.headers.get('X-Octamod-Session')!,id:String(server.db.prepare('SELECT id FROM users WHERE username=?').get(username)!.id),email}
  }
  const admin=async()=>(await(await server.call('/auth/admin','POST',{key:'e'.repeat(64)})).json()).token as string
  const items=async(token:string)=>((await(await server.call('/notifications','GET',undefined,token)).json()) as {items:NotificationItem[]}).items
  const request=async(token:string,title:string,extra:Record<string,unknown>={})=>{const result=await server.call('/forum/threads','POST',{title,body:'Idea: '+title,category:'requests',...extra},token);expect(result.status).toBe(201);return (await result.json()).id as string}
  const list=async(query:string)=>((await(await server.call('/forum/threads?'+query)).json()).threads as Listed[])
  return {...server,member,admin,items,request,list}
}

describe('feature requests',()=>{
  it('counts hearts on the opening post as votes and lists the most voted requests first',async()=>{
    const {call,db,member,request,list,items}=await fixture(),owner=await member('ideaowner'),first=await member('voterone'),second=await member('votertwo')
    const slicer=await request(owner.token,'Loop slicer'),chop=await request(owner.token,'Sample chop'),mutes=await request(owner.token,'Mute groups')
    const general=(await(await call('/forum/threads','POST',{title:'Hello','body':'Not a request',category:'general'},owner.token)).json()).id as string
    for(const [id,time] of [[slicer,'2026-10-01 10:00:00'],[chop,'2026-10-02 10:00:00'],[mutes,'2026-10-03 10:00:00'],[general,'2026-10-04 10:00:00']])db.prepare('UPDATE forum_threads SET created_at=?,updated_at=? WHERE id=?').run(time,time,id)
    expect((await call('/forum/threads/'+slicer+'/vote','POST',{enabled:true})).status).toBe(401)
    expect((await call('/forum/threads/'+slicer+'/vote','POST',{enabled:'yes'},first.token)).status).toBe(400)
    for(const [id,voter] of [[slicer,first],[slicer,second],[chop,first]] as const)expect((await call('/forum/threads/'+id+'/vote','POST',{enabled:true},voter.token)).status).toBe(200)
    expect((await call('/forum/threads/'+slicer+'/vote','POST',{enabled:true},first.token)).status).toBe(200)
    // Requests open on the most voted ideas; recent activity and new threads remain a choice.
    expect((await list('category=requests')).map(item=>[item.id,item.votes])).toEqual([[slicer,2],[chop,1],[mutes,0]])
    expect((await list('category=requests&sort=active')).map(item=>item.id)).toEqual([mutes,chop,slicer])
    expect((await list('sort=top')).map(item=>item.id)).toEqual([slicer,chop,general,mutes])
    expect((await list('')).map(item=>item.id)).toEqual([general,mutes,chop,slicer])
    expect((await list('category=general'))[0]).toMatchObject({votes:0,request_status:'open'})
    // A vote is the heart on the opening post: the post shows it, the author is told, and withdrawing it is a plain unlike.
    const detail=await(await call('/forum/threads/'+slicer,'GET',undefined,first.token)).json()
    expect(detail).toMatchObject({voted:true,canSetRequestStatus:false,thread:{votes:2,request_status:'open'}})
    expect(detail.posts[0]).toMatchObject({likes:2,liked:true})
    expect((await(await call('/forum/threads/'+slicer)).json()).voted).toBe(false)
    const liked=await items(owner.token)
    expect(liked.map(item=>item.kind)).toEqual(['post_like','post_like','post_like'])
    expect(notificationLines(liked).map(line=>line.text)).toEqual(['@voterone liked your post in “Sample chop”','@votertwo and @voterone liked your post in “Loop slicer”'])
    expect((await call('/forum/threads/'+slicer+'/vote','POST',{enabled:false},second.token)).status).toBe(200)
    expect((await list('category=requests')).map(item=>item.votes)).toEqual([1,1,0])
    expect((await items(owner.token)).map(item=>item.actor)).toEqual(['voterone','voterone'])
    expect((await call('/forum/posts/'+detail.posts[0].id+'/react','POST',{liked:false},first.token)).status).toBe(200)
    expect((await(await call('/forum/threads/'+slicer)).json()).thread.votes).toBe(0)
  })

  it('lets administrators and linked maintainers set a request status, telling the author and followers once',async()=>{
    const {call,db,member,admin,request,list,items,env}=await fixture(),owner=await member('requester'),follower=await member('requestfan'),other=await member('bystander'),maintainer=await member('modmaker')
    const id=await request(owner.token,'Freeze on the Mini Verb',{moduleId:'miniverb'}),key=await admin(),path='/forum/threads/'+id+'/request-status'
    expect((await call('/forum/threads/'+id+'/follow','POST',{enabled:true},follower.token)).status).toBe(200)
    // Neither the author nor another member decides; an administrator does.
    expect((await call(path,'PATCH',{status:'planned'},owner.token)).status).toBe(403)
    expect((await call(path,'PATCH',{status:'planned'},other.token)).status).toBe(403)
    expect((await call(path,'PATCH',{status:'soon'},other.token,key)).status).toBe(400)
    expect((await call(path,'PATCH',{status:'planned',note:'Scheduled for the next release'},other.token,key)).status).toBe(200)
    expect((await list('category=requests')).map(item=>[item.id,item.request_status])).toEqual([[id,'planned']])
    expect((await list('category=requests&status=planned')).map(item=>item.id)).toEqual([id])
    expect(await list('category=requests&status=shipped')).toEqual([])
    expect((await call('/forum/threads?status=someday')).status).toBe(400)
    expect((await(await call('/forum/threads/'+id,'GET',undefined,other.token,key)).json())).toMatchObject({canSetRequestStatus:true,thread:{request_status:'planned'}})
    expect((await(await call('/forum/threads/'+id,'GET',undefined,owner.token)).json()).canSetRequestStatus).toBe(false)
    // The author and followers hear about it; the member who changed it does not. Repeating the status stays quiet.
    const told=await items(owner.token)
    expect(told).toHaveLength(1)
    expect(told[0]).toMatchObject({kind:'request_status',excerpt:'planned',actor:'bystander',title:'Freeze on the Mini Verb',thread_id:id,module_id:'miniverb'})
    expect(notificationLines(told)[0]).toMatchObject({text:'@bystander marked the feature request “Freeze on the Mini Verb” as planned',href:threadPath(id,'Freeze on the Mini Verb')})
    expect((await items(follower.token)).map(item=>item.kind)).toEqual(['request_status'])
    expect(await items(other.token)).toEqual([])
    expect((await call(path,'PATCH',{status:'planned'},other.token,key)).status).toBe(200)
    expect(await items(owner.token)).toHaveLength(1)
    const history=(await(await call('/admin/forum/history','GET',undefined,'',key)).json() as {target:string;action:string;reason:string}[]).filter(item=>item.target===id)
    expect(history).toMatchObject([{action:'request_status:planned',reason:'Scheduled for the next release'}])
    // Only feature requests have a status.
    const general=(await(await call('/forum/threads','POST',{title:'Chat',body:'Nothing to decide',category:'general'},owner.token)).json()).id as string
    expect((await call('/forum/threads/'+general+'/request-status','PATCH',{status:'planned'},other.token,key)).status).toBe(400)
    // A claimed maintainer of the named module decides through the GitHub sign-in linked to that developer identity, until the claim is revoked.
    const author=communityModule('miniverb')!.author,developerId=crypto.randomUUID()
    db.prepare('INSERT INTO users(id,display_name,github_id,github_login) VALUES(?,?,?,?)').run(developerId,'@'+author,'4242',author)
    db.prepare('INSERT INTO module_maintainers(module_id,user_id,github_login) VALUES(?,?,?)').run('miniverb',developerId,author)
    expect((await call(path,'PATCH',{status:'shipped'},maintainer.token)).status).toBe(403)
    db.prepare("INSERT INTO auth_accounts(id,accountId,providerId,userId,createdAt,updatedAt) VALUES(?,?,'github',?,?,?)").run(crypto.randomUUID(),'4242',maintainer.id,new Date().toISOString(),new Date().toISOString())
    expect((await(await call('/forum/threads/'+id,'GET',undefined,maintainer.token)).json()).canSetRequestStatus).toBe(true)
    expect((await call(path,'PATCH',{status:'shipped'},maintainer.token)).status).toBe(200)
    expect((await items(owner.token)).map(item=>item.excerpt)).toEqual(['shipped','planned'])
    expect(notificationLines(await items(follower.token))[0].text).toBe('@modmaker marked the feature request “Freeze on the Mini Verb” as shipped')
    db.prepare('UPDATE module_maintainers SET revoked=1 WHERE user_id=?').run(developerId)
    expect((await call(path,'PATCH',{status:'open'},maintainer.token)).status).toBe(403)
    expect((await call(path,'PATCH',{status:'open'},other.token,key)).status).toBe(200)
    expect(notificationLines(await items(owner.token))[0].text).toBe('@bystander reopened the feature request “Freeze on the Mini Verb”')
    expect(history.length).toBeLessThan((await(await call('/admin/forum/history','GET',undefined,'',key)).json() as {target:string}[]).filter(item=>item.target===id).length)
    // The digest carries the change under the replies topic, so a follower who turned replies off is not mailed.
    expect((await call('/notifications/preferences','PATCH',{replies:false},follower.token)).status).toBe(200)
    sent.length=0
    await sendActivityDigests(env,env.DB!,new Date(Date.now()+15*60000))
    expect(sent.map(message=>message.to[0])).toEqual([owner.email])
    expect(sent[0].text).toContain('reopened the feature request “Freeze on the Mini Verb”')
  })
})
