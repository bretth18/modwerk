import { afterEach, describe, expect, it, vi } from 'vitest'
import { accountAuth } from '../../server/accounts'
import { ensureModuleThreads } from '../../server/module-threads'
import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { testServer } from './test-server'

const databases: Array<{close():void}>=[]
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();for(const db of databases.splice(0))db.close()})
async function fixture(){
 const service=await testServer();databases.push(service.db)
 return service
}
async function member(){
 const service=await fixture()
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:'simulated-email'})))
 const password='a diagnostic password with enough words',email='performance@example.test'
 const registered=await service.call('/auth/register','POST',{username:'performance_member',email,password,rulesVersion:COMMUNITY_RULES_VERSION})
 expect(registered.status).toBe(202)
 service.db.prepare('UPDATE auth_users SET emailVerified=1').run()
 service.db.prepare('UPDATE users SET email_verified=1').run()
 const login=await service.call('/auth/login','POST',{email,password})
 expect(login.status).toBe(200)
 const token=login.headers.get('X-Octamod-Session')!
 expect(token).toBeTruthy()
 return {...service,token}
}
describe('community request database budgets',()=>{
 it('does not initialize account schema for anonymous session or catalog reads',async()=>{
  const {env,call}=await fixture(),prepare=vi.spyOn(env.DB!,'prepare')
  expect((await call('/auth/session')).status).toBe(200)
  expect(prepare).not.toHaveBeenCalled()
  expect((await call('/catalog')).status).toBe(200)
  expect(prepare).toHaveBeenCalledTimes(1)
 })
 it('reuses the auth context for equivalent config and invalidates it on secret rotation',async()=>{
  const {env}=await fixture(),db=env.DB!,auth=accountAuth(env,db)
  expect(accountAuth({...env},db)).toBe(auth)
  expect(accountAuth({...env,AUTH_SECRET:'a different auth secret with sufficient entropy'},db)).not.toBe(auth)
 })
 it('resolves a member once per request and observes suspension on the next request',async()=>{
  const {env,db,call,token}=await member(),prepare=vi.spyOn(env.DB!,'prepare')
  const session=await (await call('/auth/session','GET',undefined,token)).json()
  expect(session.user.username).toBe('performance_member')
  expect(prepare.mock.calls.length).toBeLessThanOrEqual(4)
  expect(prepare.mock.calls.some(([sql])=>sql.includes('sqlite_master'))).toBe(false)
  db.prepare('UPDATE users SET suspended=1').run()
  const suspended=await (await call('/auth/session','GET',undefined,token)).json()
  expect(suspended).toMatchObject({user:null,admin:false})
 })
 it('returns correct member statistics with at most seven queries and no schema inspection',async()=>{
  const {env,db,call,token}=await member()
  await ensureModuleThreads(env.DB!)
  const id=(db.prepare('SELECT id FROM users WHERE username=?').get('performance_member') as {id:string}).id
  db.prepare('INSERT INTO ratings(module_id,user_id,value) VALUES(?,?,?)').run('digitakt-digihealth',id,4)
  db.prepare('INSERT INTO likes(module_id,user_id) VALUES(?,?)').run('digitakt-digihealth',id)
  db.prepare("UPDATE module_download_meta SET value=? WHERE key='collection_started'").run('2026-10-01T00:00:00Z')
  const prepare=vi.spyOn(env.DB!,'prepare')
  const data=await (await call('/modules/digitakt-digihealth','GET',undefined,token)).json()
  expect(data).toMatchObject({ratings:{average:4,count:1},ownRating:4,likes:1,liked:true,downloads:0,downloadsStarted:'2026-10-01T00:00:00Z'})
  expect(prepare.mock.calls.length).toBeLessThanOrEqual(7)
  expect(prepare.mock.calls.some(([sql])=>sql.includes('sqlite_master'))).toBe(false)
  const anonymous=await (await call('/modules/digitakt-digihealth')).json()
  expect(anonymous).toMatchObject({ratings:{average:4,count:1},ownRating:0,likes:1,liked:false})
 })

 it('shares cold forum initialization across concurrent home-page reads',async()=>{
  const {env,call}=await fixture(),prepare=vi.spyOn(env.DB!,'prepare')
  const responses=await Promise.all(['/forum/threads','/forum/categories','/forum/machines'].map(path=>call(path)))
  expect(responses.map(response=>response.status)).toEqual([200,200,200])
  expect(prepare.mock.calls.filter(([sql])=>sql.includes("WHERE id>='module-'")).length).toBe(1)
 })
 it('keeps signed-in catalog, chat, forum and statistics reads within their budgets',async()=>{
  const {env,db,call,token}=await member()
  db.prepare('UPDATE users SET is_admin=1').run()
  await call('/forum/threads')
  const prepare=vi.spyOn(env.DB!,'prepare')
  for(const [path,budget] of [
   ['/catalog',1],['/forum/shouts?compact=1',4],['/forum/threads',4],
   ['/forum/threads/module-digitakt-digihealth',8],['/admin/statistics?days=7',5],['/admin/insights',8],
  ] as const){
   prepare.mockClear()
   expect((await call(path,'GET',undefined,token)).status,path).toBe(200)
   expect(prepare.mock.calls.length,path).toBeLessThanOrEqual(budget)
   expect(prepare.mock.calls.some(([sql])=>sql.includes('sqlite_master')),path).toBe(false)
  }
  db.prepare('UPDATE users SET is_admin=0').run()
  expect((await call('/admin/statistics?days=7','GET',undefined,token)).status).toBe(403)
 })
})
