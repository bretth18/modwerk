/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanupUsage } from '../../server/usage'
import { handleApi } from '../../server/api'
import { handleCommunity } from '../../server/transport'
import { digest } from '../../server/security'
import type { Database, Statement, Env } from '../../server/platform'
const databases:DatabaseSync[]=[]
function adapter(db:DatabaseSync):Database{
 function statement(sql:string,values:SQLInputValue[]=[]):Statement{return {
  bind(...args){return statement(sql,args as SQLInputValue[])},
  async first<T>(){return (db.prepare(sql).get(...values) as T|undefined)??null},
  async all<T>(){return {results:db.prepare(sql).all(...values) as T[]}},
  async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}}}
 }}
 return {prepare:statement,async batch(items){db.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}}}
}
async function fixture(){
 const db=new DatabaseSync(':memory:');databases.push(db);db.exec(readFileSync(new URL('../../migrations/0001_community.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../../migrations/0003_module_publications.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0004_sign_in_grants.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0005_configuration_choosers.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0006_configuration_versions.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0007_guest_only_admin.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0008_private_usage.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0009_module_downloads.sql',import.meta.url),'utf8'))
 const env:Env={DB:adapter(db),APP_URL:'https://octamod.test',ADMIN_KEY_SHA256:await digest(adminKey)}
 const objects=new Map<string,ArrayBuffer>()
 env.MEDIA={async put(key,bytes){objects.set(key,bytes)},async get(key){const bytes=objects.get(key);return bytes?{body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array(bytes));controller.close()}})}:null},async delete(key){objects.delete(key)}}
 const tokens={author:'a'.repeat(64),other:'b'.repeat(64)}
 for(const [role,name] of [['author','Author guest'],['other','Another guest']] as const){
  db.prepare('INSERT INTO users(id,display_name) VALUES(?,?)').run(role,name)
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(await digest(tokens[role]),role,Math.floor(Date.now()/1000)+600)
 }
 async function call(path:string,method='GET',body?:unknown,auth='',origin=env.APP_URL!,admin=''){
  const headers:Record<string,string>={Origin:origin};if(auth)headers.Cookie=auth;if(admin)headers['X-Octamod-Admin']=admin
  if(body!==undefined)headers['Content-Type']='application/json'
  return handleApi(new Request(env.APP_URL+'/api'+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined}),env)
 }
 async function openAdmin(key=adminKey){return call('/auth/admin','POST',{key})}
 const admin=(await (await openAdmin()).json()).token as string
 return {db,env,call,tokens,admin,openAdmin}
}
const adminKey='e'.repeat(64)
afterEach(()=>{vi.useRealTimers();for(const db of databases.splice(0))db.close()})
const details={moduleId:'new-filter',title:'New filter',repositoryUrl:'https://github.com/sambanks/example/tree/main/modules/filter',description:'Original filter',usage:'Choose the filter',testReportUrl:'https://github.com/sambanks/example/blob/main/TESTS.md',stressNotes:'Eight tracks under stress',qualityNotes:'Emulator only; hardware untested',resourceNotes:'100 words; CPU not measured',license:'Original code, MIT; own capture',rightsConfirmed:true}
describe('community access and review',()=>{
 it('accepts module contributions through PRs only, including authors and admins',async()=>{
  const {call,db,tokens,admin}=await fixture()
  for(const path of ['/submissions','/submissions/test/media','/submissions/test/submit','/review/test','/repository/import','/repository/media']){
   for(const session of ['', 'octamod_session='+tokens.author])expect((await call(path,'POST',details,session)).status).toBe(410)
   expect((await call(path,'POST',details,'',undefined,admin)).status).toBe(410)
  }
  expect(db.prepare('SELECT COUNT(*) AS count FROM submissions').get()).toEqual({count:0})
  expect((await call('/submissions','POST',details,'','https://elsewhere.test')).status).toBe(403)
 })
 it('preserves existing publications when obsolete approval endpoints are called and keeps withdrawal private',async()=>{
  const {call,db,tokens,admin:token}=await fixture(),author='octamod_session='+tokens.author
  const asAdmin=(path:string,method='GET',body?:unknown)=>call(path,method,body,'',undefined,token)
  for(const path of ['/admin/overview','/admin/history','/admin/issues','/admin/comments']){expect((await call(path)).status).toBe(403);expect((await call(path,'GET',undefined,author)).status).toBe(403);expect((await call(path,'GET',undefined,'',undefined,'f'.repeat(64))).status).toBe(403)}
  db.prepare("INSERT INTO submissions(id,owner_id,module_id,title,repository_url,description,usage,test_report_url,stress_notes,quality_notes,resource_notes,license,rights_confirmed,status) VALUES('approved','author','new-filter','Version one','https://github.com/author/repo','Original filter','Usage','https://github.com/author/repo','Stress evidence','Quality evidence','Measured resources','MIT',1,'approved')").run()
  db.prepare("INSERT INTO module_publications(module_id,submission_id) VALUES('new-filter','approved')").run()
  expect((await asAdmin('/review/new-version','POST',{decision:'approved',evidenceVerified:true,note:'Attempted bypass'})).status).toBe(410)
  expect((await (await call('/catalog')).json())[0].title).toBe('Version one')
  expect((await call('/admin/modules/new-filter/withdraw','POST',{note:'Rights concern'},author)).status).toBe(403)
  expect((await asAdmin('/admin/modules/new-filter/withdraw','POST',{note:'Rights concern'})).status).toBe(200)
  expect(await (await call('/catalog')).json()).toEqual([])
  expect((await (await asAdmin('/admin/history')).json()).map((item:{action:string;actor:string})=>[item.action,item.actor])).toEqual([['withdrawn','Octamod administrator']])
 })
 it('accepts comments and ratings with no registration or email, preserving browser ownership',async()=>{
  const {call}=await fixture();const posted=await call('/modules/spectrum/comments','POST',{body:'Useful module',displayName:'Listener'});expect(posted.status).toBe(200)
  const cookie=posted.headers.get('set-cookie')!;expect(cookie).toContain('HttpOnly');const session=cookie.split(';')[0]
  expect((await call('/modules/spectrum/rating','POST',{value:5},session)).status).toBe(200)
  expect((await call('/modules/spectrum/rating','POST',{value:3},session)).status).toBe(200)
  const page=await (await call('/modules/spectrum','GET',undefined,session)).json()
  expect(page.ratings).toEqual({average:3,count:1});expect(page.comments[0].author).toBe('Listener');expect(page.comments[0].canDelete).toBe(true);expect(JSON.stringify(page)).not.toContain('email')
  expect((await call('/modules/spectrum/rating','POST',{value:6},session)).status).toBe(400)
  expect((await call('/modules/spectrum/like','POST',{liked:true},session)).status).toBe(200)
  expect((await call('/modules/spectrum/like','POST',{liked:true},session)).status).toBe(200)
  expect((await (await call('/modules/spectrum','GET',undefined,session)).json()).likes).toBe(1)
  expect((await call('/submissions','POST',details,session)).status).toBe(410)
  expect((await call('/modules/remix-miniverb/comments','POST',{body:'Guest remix discussion'},session)).status).toBe(200)
  expect((await call('/modules/remix-miniverb/rating','POST',{value:4},session)).status).toBe(200)
  expect((await call('/auth/email','POST',{email:'unused@example.test'})).status).toBe(404)
  const own=await (await call('/auth/session','GET',undefined,session)).json()
  expect(own).toEqual({available:true,admin:false,user:{id:own.user.id,displayName:'Listener'}})
 })
 it('keeps previously uploaded private media restricted without offering new upload routes',async()=>{
  const {call,db,env,tokens}=await fixture(),auth='octamod_session='+tokens.author,other='octamod_session='+tokens.other
  db.prepare("INSERT INTO submissions(id,owner_id,module_id,title,repository_url,description,usage,test_report_url,stress_notes,quality_notes,resource_notes,license,status) VALUES('legacy','author','new-filter','Legacy','https://github.com/author/repo','Original','Usage','https://github.com/author/repo','Stress','Quality','Resources','MIT','draft')").run()
  db.prepare("INSERT INTO media(id,submission_id,kind,mime,caption,capture_type,object_key,bytes) VALUES('preview','legacy','image','image/png','Test','emulator','legacy/preview',32)").run()
  await env.MEDIA!.put('legacy/preview',new Uint8Array(32).buffer)
  expect((await call('/media/preview')).status).toBe(404)
  expect((await call('/media/preview','GET',undefined,other)).status).toBe(404)
  expect((await call('/media/preview','GET',undefined,auth)).status).toBe(200)
  expect((await call('/submissions/legacy/media','POST',{},auth)).status).toBe(410)
 })
 it('keeps account-free issue reports private to the administrator and the reporting device',async()=>{
  const {call,tokens,admin}=await fixture()
  const result=await call('/modules/spectrum/issues','POST',{title:'Knob issue',body:'Steps and revision',displayName:'Listener'});expect(result.status).toBe(201);expect((await result.json()).author).toBe('sambanks')
  const reporter=result.headers.get('set-cookie')!.split(';')[0],other='octamod_session='+tokens.other,author='octamod_session='+tokens.author
  for(const session of ['',other,author,reporter])expect((await call('/admin/issues','GET',undefined,session)).status).toBe(403)
  expect((await call('/issues','GET',undefined,reporter)).status).toBe(404)
  expect(await (await call('/issues/mine')).json()).toEqual([])
  expect(await (await call('/issues/mine','GET',undefined,other)).json()).toEqual([])
  const mine=await (await call('/issues/mine','GET',undefined,reporter)).json();expect(mine).toHaveLength(1);expect(mine[0]).toMatchObject({author_login:'sambanks',status:'open'})
  const inbox=await (await call('/admin/issues','GET',undefined,'',undefined,admin)).json();expect(inbox).toHaveLength(1);expect(inbox[0].reporter).toBe('Listener')
  expect((await call('/admin/issues/'+inbox[0].id,'PATCH',{status:'closed'},reporter)).status).toBe(403)
  expect((await call('/admin/issues/'+inbox[0].id,'PATCH',{status:'closed'},'',undefined,admin)).status).toBe(200)
  expect((await (await call('/issues/mine','GET',undefined,reporter)).json())[0].status).toBe('closed')
 })
 it('retires account-bound cloud configuration copies; configurations stay on the device',async()=>{
  const {call,tokens}=await fixture(),auth='octamod_session='+tokens.author
  const config={id:'one',name:'Live',moduleIds:['spectrum'],moduleVersions:{spectrum:'0.0.9'},revision:0}
  expect((await call('/configurations','PUT',config,auth)).status).toBe(410)
  expect((await call('/configurations','GET',undefined,auth)).status).toBe(410)
  expect((await call('/configurations/one','DELETE',undefined,auth)).status).toBe(410)
 })
})

describe('separate administrator access',()=>{
 it('fails closed until a key is configured and never treats a guest session as administrator',async()=>{
  const {env,call,admin,tokens,db}=await fixture()
  expect((await (await call('/auth/session','GET',undefined,'',undefined,admin)).json()).admin).toBe(true)
  expect((await (await call('/auth/session','GET',undefined,'octamod_session='+tokens.author)).json()).admin).toBe(false)
  expect(db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id='administrator'").get()).toEqual({count:0})
  env.ADMIN_KEY_SHA256=undefined
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(403)
  expect((await call('/auth/admin','POST',{key:adminKey})).status).toBe(503)
  env.ADMIN_KEY_SHA256='not-a-digest'
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(403)
 })
 it('rejects wrong keys, throttles guessing, and revokes sessions on sign-out or key rotation',async()=>{
  const {env,call,admin,openAdmin}=await fixture()
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(200)
  expect((await openAdmin('f'.repeat(64))).status).toBe(403)
  expect((await openAdmin('short')).status).toBe(403)
  expect((await call('/auth/admin','POST',{key:adminKey},'','https://elsewhere.test')).status).toBe(403)
  const second=(await (await openAdmin()).json()).token as string
  expect((await openAdmin('f'.repeat(64))).status).toBe(403)
  expect((await openAdmin()).status).toBe(429)
  expect((await call('/auth/admin','DELETE',undefined,'',undefined,second)).status).toBe(200)
  expect((await call('/admin/overview','GET',undefined,'',undefined,second)).status).toBe(403)
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(200)
  env.ADMIN_KEY_SHA256=await digest('d'.repeat(64))
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(403)
 })
 it('lets the administrator moderate guest comments without a guest identity',async()=>{
  const {call,admin}=await fixture()
  const posted=await call('/modules/spectrum/comments','POST',{body:'Spam',displayName:'Guest'});const guest=posted.headers.get('set-cookie')!.split(';')[0]
  const [comment]=await (await call('/admin/comments','GET',undefined,'',undefined,admin)).json() as {id:string}[]
  expect((await (await call('/modules/spectrum','GET',undefined,'',undefined,admin)).json()).comments[0].canDelete).toBe(true)
  expect((await (await call('/modules/spectrum')).json()).comments[0].canDelete).toBe(false)
  expect((await call('/comments/'+comment.id,'DELETE')).status).toBe(401)
  expect((await call('/comments/'+comment.id,'DELETE',undefined,'',undefined,admin)).status).toBe(200)
  expect((await (await call('/modules/spectrum','GET',undefined,guest)).json()).comments).toEqual([])
 })
})

describe('GitHub Pages and separate backend',()=>{
 it('allows exactly the configured origin and bounded preflights, including errors',async()=>{
  const {env}=await fixture();env.APP_URL='https://octamod.github.io/octamod/'
  const allowed='https://octamod.github.io',backend='https://community.workers.dev'
  const preflight=await handleCommunity(new Request(backend+'/api/submissions',{method:'OPTIONS',headers:{Origin:allowed,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Authorization, Content-Type, X-Octamod-Admin'}}),env)
  expect(preflight.status).toBe(204);expect(preflight.headers.get('access-control-allow-origin')).toBe(allowed)
  expect(preflight.headers.get('access-control-allow-credentials')).toBeNull()
  const deniedHeaders:Record<string,string>[]=[{Origin:'https://evil.test','Access-Control-Request-Method':'POST'},{Origin:allowed,'Access-Control-Request-Method':'TRACE'},{Origin:allowed,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'X-Unsafe'}]
  for(const headers of deniedHeaders)expect((await handleCommunity(new Request(backend+'/api/submissions',{method:'OPTIONS',headers}),env)).status).toBe(403)
  const error=await handleCommunity(new Request(backend+'/api/submissions',{method:'POST',headers:{Origin:allowed}}),env)
  expect(error.status).toBe(410);expect(error.headers.get('access-control-allow-origin')).toBe(allowed)
  expect((await handleCommunity(new Request(backend+'/api/auth/session',{headers:{Origin:'https://evil.test'}}),env)).status).toBe(403)
 })
 it('keeps guest ownership across domains without cookies and revokes bearer sessions',async()=>{
  const {env}=await fixture();env.SESSION_TRANSPORT='bearer'
  const endpoint='https://community.workers.dev/api'
  async function call(path:string,method='GET',body?:unknown,session=''){
   const headers=new Headers({Origin:new URL(env.APP_URL!).origin})
   if(session)headers.set('Authorization','Bearer '+session)
   if(body!==undefined)headers.set('Content-Type','application/json')
   return handleCommunity(new Request(endpoint+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined}),env)
  }
  const result=await call('/modules/spectrum/comments','POST',{body:'Cross-domain guest'})
  const session=result.headers.get('X-Octamod-Session')!
  expect(session).toMatch(/^[a-f0-9]{64}$/);expect(result.headers.get('set-cookie')).toBeNull()
  expect(result.headers.get('access-control-expose-headers')).toBe('X-Octamod-Session')
  const mine=await (await call('/modules/spectrum','GET',undefined,session)).json();expect(mine.comments[0].canDelete).toBe(true)
  expect((await call('/submissions','POST',details,session)).status).toBe(410)
  const logout=await call('/auth/logout','POST',{},session);expect(logout.headers.get('X-Octamod-Session')).toBe('')
  expect((await (await call('/auth/session','GET',undefined,session)).json()).user).toBeNull()
 })
 it('has no website sign-in routes or GitHub identity in the session contract',async()=>{
  const {env}=await fixture();env.SESSION_TRANSPORT='bearer';env.APP_URL='https://octamod.github.io/octamod/'
  const endpoint='https://community.workers.dev/api',headers={Origin:'https://octamod.github.io','Content-Type':'application/json'}
  for(const path of ['/auth/github','/auth/github/callback','/auth/complete'])for(const method of ['GET','POST']){
   const result=await handleCommunity(new Request(endpoint+path,{method,headers,body:method==='POST'?'{}':undefined}),env)
   expect(result.status).toBe(410);expect(result.headers.get('location')).toBeNull();expect(result.headers.get('set-cookie')).toBeNull()
  }
  const session=await (await handleCommunity(new Request(endpoint+'/auth/session',{headers}),env)).text()
  expect(session).not.toMatch(/github/i)
 })
})

const usageEvent=(event='page_view',visitor='11111111-1111-4111-8111-111111111111',eventId=crypto.randomUUID())=>({event,visitor,eventId})
describe('administrator insights',()=>{
 it('denies guests and invalid administrators and returns empty aggregates without private identities',async()=>{
  const {call,admin,tokens}=await fixture()
  for(const auth of ['', 'octamod_session='+tokens.author])expect((await call('/admin/insights','GET',undefined,auth)).status).toBe(403)
  expect((await call('/admin/insights','GET',undefined,'',undefined,'f'.repeat(64))).status).toBe(403)
  expect((await call('/community/insights')).status).toBe(404)
  const result=await call('/admin/insights','GET',undefined,'',undefined,admin)
  expect(result.headers.get('cache-control')).toBe('no-store')
  const insights=await result.json()
  expect(insights.totals).toEqual({openIssues:0,closedIssues:0,comments:0,likes:0,ratings:0,downloads:0,published:0,mediaBytes:0})
  expect(insights.issueAges).toEqual({underWeek:0,weekToMonth:0,overMonth:0,oldest:null})
  expect(insights.modules.find((module:{moduleId:string})=>module.moduleId==='miniverb')).toMatchObject({ratings:0,ratingAverage:null,comments:0,downloads:0})
  expect(JSON.stringify(insights)).not.toContain('Author guest')
 })
 it('avoids join multiplication, ages only open reports and retains withdrawn module history',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-03T12:00:00Z'))
  const {call,admin,db}=await fixture()
  for(const [id,module,date,status] of [['fresh','miniverb','2026-10-03 11:00:00','open'],['week','miniverb','2026-09-26 12:00:00','open'],['almost-week','miniverb','2026-09-26 12:01:00','open'],['month','removed-module','2026-09-03 12:00:00','open'],['closed','miniverb','2026-08-01 12:00:00','closed']])db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,created_at,status) VALUES(?,?,'author','author','Private report title','Private report body',?,?)").run(id,module,date,status)
  for(const id of ['one','two'])db.prepare("INSERT INTO comments(id,module_id,user_id,body) VALUES(?,'miniverb','author','A comment body')").run(id)
  for(const user of ['author','other']){db.prepare("INSERT INTO likes(module_id,user_id) VALUES('miniverb',?)").run(user);db.prepare("INSERT INTO ratings(module_id,user_id,value) VALUES('miniverb',?,?)").run(user,user==='author'?5:4)}
  db.prepare("INSERT INTO module_downloads(module_id,downloads) VALUES('miniverb',8)").run()
  const result=await (await call('/admin/insights','GET',undefined,'',undefined,admin)).json()
  expect(result.totals).toMatchObject({openIssues:4,closedIssues:1,comments:2,likes:2,ratings:2,downloads:8})
  expect(result.issueAges).toEqual({underWeek:2,weekToMonth:1,overMonth:1,oldest:'2026-09-03 12:00:00'})
  expect(result.modules.find((module:{moduleId:string})=>module.moduleId==='miniverb')).toMatchObject({comments:2,likes:2,ratings:2,ratingAverage:4.5,openIssues:3,downloads:8})
  expect(result.modules.find((module:{moduleId:string})=>module.moduleId==='removed-module')).toMatchObject({available:false,openIssues:1})
  for(const privateValue of ['Private report','A comment body','Author guest','reporter_id','user_id'])expect(JSON.stringify(result)).not.toContain(privateValue)
  await call('/admin/issues/month','PATCH',{status:'closed'},'',undefined,admin)
  const updated=await (await call('/admin/insights','GET',undefined,'',undefined,admin)).json()
  expect(updated.issueAges.overMonth).toBe(0);expect(updated.totals.openIssues).toBe(3)
 })
 it('filters the private issue inbox before its limit and validates status with bound module IDs',async()=>{
  const {call,admin,db}=await fixture()
  for(let index=0;index<201;index++)db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,status,created_at) VALUES(?,'spectrum','author','author','Other report','Details','closed','2026-10-03 12:00:00')").run('other-'+index)
  db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,created_at) VALUES('wanted','miniverb','author','author','Older open report','Details','2026-09-01 12:00:00')").run()
  const path='/admin/issues?moduleId=miniverb&status=open'
  expect((await call(path)).status).toBe(403)
  expect((await (await call(path,'GET',undefined,'',undefined,admin)).json()).map((issue:{id:string})=>issue.id)).toEqual(['wanted'])
  expect((await (await call('/admin/issues?moduleId='+encodeURIComponent("miniverb' OR 1=1 --"),'GET',undefined,'',undefined,admin)).json())).toEqual([])
  expect((await call('/admin/issues?status=invalid','GET',undefined,'',undefined,admin)).status).toBe(400)
 })
 it('compares completed UTC windows and refuses partial collection or expired history',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-03T12:00:00Z'))
  const {call,admin,db}=await fixture()
  db.prepare("INSERT INTO usage_meta(key,value) VALUES('collection_started','2026-08-01T12:00:00Z')").run()
  for(const date of ['2026-09-20','2026-09-21','2026-09-26','2026-09-27','2026-10-02','2026-10-03'])db.prepare('INSERT INTO usage_daily(day,visitors) VALUES(?,1)').run(date)
  const stats=async(days:number)=>(await call('/admin/statistics?days='+days,'GET',undefined,'',undefined,admin)).json()
  const week=await stats(7)
  expect(week.from).toBe('2026-09-27');expect(week.to).toBe('2026-10-03')
  expect(week.comparison).toMatchObject({from:'2026-09-21',to:'2026-09-26',unavailableReason:null})
  expect(week.comparison.rows.map((row:{day:string})=>row.day)).toEqual(['2026-09-21','2026-09-26'])
  expect((await stats(30)).comparison).toMatchObject({from:'2026-08-06',to:'2026-09-03',unavailableReason:null,rows:[]})
  expect((await stats(90)).comparison).toMatchObject({unavailableReason:'retention',rows:[]})
  db.prepare("UPDATE usage_meta SET value='2026-09-21T00:01:00Z'").run()
  expect((await stats(7)).comparison).toMatchObject({unavailableReason:'collection',rows:[]})
  db.prepare("UPDATE usage_meta SET value='2026-09-20T23:59:00Z'").run()
  expect((await stats(7)).comparison.unavailableReason).toBeNull()
 })
})

describe('private aggregate usage statistics',()=>{
 it('counts events once, deduplicates daily visitors, and keeps summaries behind administrator authorization',async()=>{
  const {call,db,admin,tokens}=await fixture(),first=usageEvent()
  expect((await call('/usage/events','POST',first)).status).toBe(200)
  expect((await call('/usage/events','POST',first)).status).toBe(200)
  for(const event of ['configuration_started','build_succeeded','firmware_download_requested','configuration_exported'])expect((await call('/usage/events','POST',usageEvent(event))).status).toBe(200)
  expect((await call('/usage/events','POST',usageEvent('page_view','22222222-2222-4222-8222-222222222222'))).status).toBe(200)
  for(const auth of ['', 'octamod_session='+tokens.author])expect((await call('/admin/statistics','GET',undefined,auth)).status).toBe(403)
  expect((await call('/usage/events','GET')).status).toBe(404)
  const response=await call('/admin/statistics?days=7','GET',undefined,'',undefined,admin)
  expect(response.headers.get('cache-control')).toBe('no-store')
  const result=await response.json();expect(result.rows).toHaveLength(1)
  expect(result.rows[0]).toMatchObject({visitors:2,page_views:2,configurations:1,builds:1,downloads:1,exports:1})
  expect(result.collectionStarted).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  expect(JSON.stringify(db.prepare('SELECT * FROM usage_visitors').all())).not.toContain(first.visitor)
  expect(JSON.stringify(db.prepare('SELECT * FROM usage_events').all())).not.toContain(first.eventId)
  expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({n:3}) // No visitor accounts are created.
  expect((await call('/admin/statistics?days=365','GET',undefined,'',undefined,admin)).status).toBe(400)
  expect((await handleApi(new Request('https://octamod.test/api/admin/statistics',{headers:{'X-Octamod-Admin':admin}}),{DB:adapter(db),APP_URL:'https://octamod.test'})).status).toBe(403)
 })
 it('rolls back a failed count and allows an unchanged event to be safely retried',async()=>{
  const {call,db}=await fixture(),event=usageEvent()
  db.exec("CREATE TRIGGER fail_usage_count BEFORE INSERT ON usage_daily BEGIN SELECT RAISE(ABORT,'Synthetic failure'); END")
  expect((await call('/usage/events','POST',event)).status).toBe(500)
  for(const table of ['usage_events','usage_visitors','usage_daily','usage_meta'])expect(db.prepare('SELECT COUNT(*) AS n FROM '+table).get()).toEqual({n:0})
  db.exec('DROP TRIGGER fail_usage_count')
  expect((await call('/usage/events','POST',event)).status).toBe(200)
  expect((await call('/usage/events','POST',{...event,event:'build_succeeded'})).status).toBe(200)
  expect(db.prepare('SELECT visitors,page_views,builds FROM usage_daily').get()).toEqual({visitors:1,page_views:1,builds:0})
 })
 it('refuses firmware, configuration content, extra fields, invalid events and other origins without recording them',async()=>{
  const {call,db,env}=await fixture()
  for(const body of [{...usageEvent(),firmware:'not accepted'},{...usageEvent(),moduleIds:['miniverb']},{...usageEvent(),email:'not collected'},usageEvent('arbitrary_event'),{...usageEvent(),visitor:'stable-user-name'}])expect((await call('/usage/events','POST',body)).status).toBe(400)
  expect((await call('/usage/events','POST',{...usageEvent(),firmware:'x'.repeat(1024)})).status).toBe(413)
  expect((await call('/usage/events','POST',usageEvent(),'','https://elsewhere.test')).status).toBe(403)
  expect((await handleApi(new Request('https://octamod.test/api/usage/events',{method:'POST',headers:{Origin:env.APP_URL!,'Content-Type':'application/octet-stream'},body:'ELEK'}),env)).status).toBe(415)
  expect(db.prepare('SELECT COUNT(*) AS n FROM usage_daily').get()).toEqual({n:0})
 })
 it('honors browser privacy headers and fails closed when usage is not configured',async()=>{
  const {env,db}=await fixture()
  for(const header of ['DNT','Sec-GPC'])expect((await handleCommunity(new Request('https://octamod.test/api/usage/events',{method:'POST',headers:{Origin:env.APP_URL!,'Content-Type':'application/json',[header]:'1'},body:JSON.stringify(usageEvent())}),env)).status).toBe(204)
  expect(db.prepare('SELECT COUNT(*) AS n FROM usage_events').get()).toEqual({n:0})
  expect((await handleCommunity(new Request('https://octamod.test/api/usage/events',{method:'POST',headers:{Origin:env.APP_URL!,'Content-Type':'application/json'},body:JSON.stringify(usageEvent())}),{...env,ADMIN_KEY_SHA256:undefined})).status).toBe(503)
 })
 it('changes server visitor hashes every UTC day and preserves independent daily counts',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-01T23:59:00Z'))
  const {call,db}=await fixture(),event=usageEvent()
  expect((await call('/usage/events','POST',event)).status).toBe(200)
  vi.setSystemTime(new Date('2026-10-02T00:01:00Z'))
  expect((await call('/usage/events','POST',event)).status).toBe(200)
  const visitors=db.prepare('SELECT visitor_hash FROM usage_visitors ORDER BY day').all();expect(visitors).toHaveLength(2);expect(visitors[0]).not.toEqual(visitors[1])
  expect(db.prepare('SELECT visitors,page_views FROM usage_daily ORDER BY day').all()).toEqual([{visitors:1,page_views:1},{visitors:1,page_views:1}])
 })
 it('expires short-lived markers, keeps 90 aggregate days and reports absent historical coverage honestly',async()=>{
  const {call,db,env,admin}=await fixture()
  const empty=await (await call('/admin/statistics','GET',undefined,'',undefined,admin)).json();expect(empty.collectionStarted).toBeNull();expect(empty.rows).toEqual([])
  for(const date of ['2026-07-03','2026-07-04','2026-09-29','2026-09-30']){
   db.prepare('INSERT INTO usage_daily(day,visitors) VALUES(?,1)').run(date)
   db.prepare('INSERT INTO usage_visitors(day,visitor_hash) VALUES(?,?)').run(date,'a'.repeat(64))
   db.prepare('INSERT INTO usage_events(day,event_hash) VALUES(?,?)').run(date,'b'.repeat(64))
  }
  await cleanupUsage(env.DB!,new Date('2026-10-01T12:00:00Z'))
  expect(db.prepare('SELECT day FROM usage_daily ORDER BY day').all()).toEqual([{day:'2026-07-04'},{day:'2026-09-29'},{day:'2026-09-30'}])
  expect(db.prepare('SELECT day FROM usage_visitors').all()).toEqual([{day:'2026-09-30'}]);expect(db.prepare('SELECT day FROM usage_events').all()).toEqual([{day:'2026-09-30'}])
 })
 it('limits event bursts without accepting further counts',async()=>{
  const {call,db}=await fixture()
  for(let i=0;i<200;i++)expect((await call('/usage/events','POST',usageEvent())).status).toBe(200)
  expect((await call('/usage/events','POST',usageEvent())).status).toBe(429)
  expect(db.prepare('SELECT visitors,page_views FROM usage_daily').get()).toEqual({visitors:1,page_views:200})
 })
})

const moduleDownload=(moduleId='miniverb',eventId=crypto.randomUUID())=>({moduleId,eventId,visitor:'11111111-1111-4111-8111-111111111111'})
describe('public module popularity',()=>{
 it('includes unrated likes and download-only modules without disclosing private statistics',async()=>{
  const {call,db,tokens}=await fixture()
  expect((await call('/modules/miniverb/like','POST',{liked:true},'octamod_session='+tokens.author)).status).toBe(200)
  const event=moduleDownload('tapeecho')
  expect((await call('/usage/module-downloads','POST',event)).status).toBe(200)
  expect((await call('/usage/module-downloads','POST',event)).status).toBe(200)
  const response=await call('/community/summary'),summary=await response.json()
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(summary.find((item:{module_id:string})=>item.module_id==='miniverb')).toMatchObject({count:0,likes:1,downloads:0})
  expect(summary.find((item:{module_id:string})=>item.module_id==='tapeecho')).toMatchObject({count:0,likes:0,downloads:1})
  expect(summary.find((item:{module_id:string})=>item.module_id==='euclid')).toMatchObject({count:0,likes:0,downloads:0,downloadsStarted:expect.any(String)})
  expect(JSON.stringify(summary)).not.toMatch(/visitor|event_hash|eventId|configuration|email|author/i)
  expect((await (await call('/modules/tapeecho')).json()).downloads).toBe(1)
  expect((await call('/admin/statistics')).status).toBe(403)
  expect(db.prepare('SELECT COUNT(*) AS n FROM usage_daily').get()).toEqual({n:0})
  expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({n:3})
  expect((await call('/modules/miniverb/like','POST',{liked:false},'octamod_session='+tokens.author)).status).toBe(200)
  expect((await (await call('/community/summary')).json()).find((item:{module_id:string})=>item.module_id==='miniverb').likes).toBe(0)
 })
 it('counts each included module independently, suppresses retries and preserves separate repeated downloads',async()=>{
  const {call,db}=await fixture(),first=moduleDownload()
  for(const event of [first,first,{...first,moduleId:'tapeecho'},moduleDownload('tapeecho'),moduleDownload()])expect((await call('/usage/module-downloads','POST',event)).status).toBe(200)
  expect(db.prepare('SELECT * FROM module_downloads ORDER BY module_id').all()).toEqual([{module_id:'miniverb',downloads:2},{module_id:'tapeecho',downloads:1}])
  const markers=JSON.stringify(db.prepare('SELECT * FROM module_download_events').all())
  expect(markers).not.toContain(first.visitor);expect(markers).not.toContain(first.eventId);expect(markers).not.toContain('miniverb')
  expect(db.prepare('SELECT COUNT(*) AS n FROM module_download_events').get()).toEqual({n:3})
 })
 it('rolls back failed totals so a retry counts exactly once',async()=>{
  const {call,db}=await fixture(),event=moduleDownload()
  db.exec("CREATE TRIGGER fail_module_count BEFORE INSERT ON module_downloads BEGIN SELECT RAISE(ABORT,'Synthetic failure'); END")
  expect((await call('/usage/module-downloads','POST',event)).status).toBe(500)
  expect(db.prepare('SELECT COUNT(*) AS n FROM module_download_events').get()).toEqual({n:0})
  db.exec('DROP TRIGGER fail_module_count')
  for(let i=0;i<2;i++)expect((await call('/usage/module-downloads','POST',event)).status).toBe(200)
  expect(db.prepare('SELECT downloads FROM module_downloads').get()).toEqual({downloads:1})
 })
 it('rejects unavailable modules, configuration data and firmware without recording anything',async()=>{
  const {call,db,env}=await fixture()
  for(const body of [moduleDownload('unknown'),moduleDownload('spectrum'),moduleDownload('modulation'),moduleDownload('character'),moduleDownload('remix-unknown'),{...moduleDownload(),moduleIds:['tapeecho']},{...moduleDownload(),firmware:'not accepted'},{...moduleDownload(),configuration:'not accepted'},{...moduleDownload(),eventId:'invalid'},{...moduleDownload(),visitor:'invalid'}])expect((await call('/usage/module-downloads','POST',body)).status).toBe(400)
  expect((await call('/usage/module-downloads','POST',{...moduleDownload(),firmware:'x'.repeat(1024)})).status).toBe(413)
  expect((await call('/usage/module-downloads','POST',moduleDownload(),'','https://elsewhere.test')).status).toBe(403)
  expect((await handleApi(new Request('https://octamod.test/api/usage/module-downloads',{method:'POST',headers:{Origin:env.APP_URL!,'Content-Type':'application/octet-stream'},body:'ELEK'}),env)).status).toBe(415)
  expect(db.prepare('SELECT COUNT(*) AS n FROM module_downloads').get()).toEqual({n:0})
  expect(db.prepare('SELECT COUNT(*) AS n FROM module_download_events').get()).toEqual({n:0})
 })
 it('honors privacy headers, requires backend configuration and limits bursts',async()=>{
  const {env,db,call}=await fixture()
  for(const header of ['DNT','Sec-GPC'])expect((await handleCommunity(new Request('https://octamod.test/api/usage/module-downloads',{method:'POST',headers:{Origin:env.APP_URL!,'Content-Type':'application/json',[header]:'1'},body:JSON.stringify(moduleDownload())}),env)).status).toBe(204)
  expect(db.prepare('SELECT COUNT(*) AS n FROM module_downloads').get()).toEqual({n:0})
  expect((await handleCommunity(new Request('https://octamod.test/api/usage/module-downloads',{method:'POST',headers:{Origin:env.APP_URL!,'Content-Type':'application/json'},body:JSON.stringify(moduleDownload())}),{...env,ADMIN_KEY_SHA256:undefined})).status).toBe(503)
  for(let i=0;i<200;i++)expect((await call('/usage/module-downloads','POST',moduleDownload())).status).toBe(200)
  expect((await call('/usage/module-downloads','POST',moduleDownload())).status).toBe(429)
  expect(db.prepare('SELECT downloads FROM module_downloads').get()).toEqual({downloads:200})
 })
 it('expires anonymous download markers while preserving public totals and the coverage date',async()=>{
  const {db,env}=await fixture()
  db.prepare("INSERT INTO module_downloads VALUES('miniverb',17)").run()
  for(const date of ['2026-09-29','2026-09-30','2026-10-01'])db.prepare('INSERT INTO module_download_events(day,event_hash) VALUES(?,?)').run(date,'a'.repeat(64))
  const started=db.prepare('SELECT value FROM module_download_meta').get()
  await cleanupUsage(env.DB!,new Date('2026-10-01T12:00:00Z'))
  expect(db.prepare('SELECT day FROM module_download_events ORDER BY day').all()).toEqual([{day:'2026-09-30'},{day:'2026-10-01'}])
  expect(db.prepare('SELECT downloads FROM module_downloads').get()).toEqual({downloads:17})
  expect(db.prepare('SELECT value FROM module_download_meta').get()).toEqual(started)
 })
})


it('retains the first approved addition date when a community module is updated', async () => {
 const { db, call } = await fixture()
 const insert = db.prepare("INSERT INTO submissions(id,owner_id,module_id,title,repository_url,description,usage,test_report_url,stress_notes,quality_notes,resource_notes,license,rights_confirmed,status,reviewed_at) VALUES(?,'author','new-filter',?,'https://github.com/author/repo','Original','Usage','https://github.com/author/repo','Stress','Quality','Resources','MIT',1,?,?)")
 insert.run('rejected', 'Rejected draft', 'rejected', '2026-09-29 12:00:00')
 insert.run('initial', 'Version one', 'approved', '2026-10-01 12:00:00')
 insert.run('update', 'Version two', 'approved', '2026-10-02 12:00:00')
 db.prepare("INSERT INTO module_publications(module_id,submission_id) VALUES('new-filter','initial')").run()
 expect((await (await call('/catalog')).json())[0].added_at).toBe('2026-10-01T12:00:00Z')
 db.prepare("UPDATE module_publications SET submission_id='update' WHERE module_id='new-filter'").run()
 expect((await (await call('/catalog')).json())[0]).toMatchObject({ title: 'Version two', reviewed_at: '2026-10-02 12:00:00', added_at: '2026-10-01T12:00:00Z' })
})
