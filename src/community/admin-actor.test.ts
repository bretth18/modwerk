import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testServer } from './test-server'
import { digest } from '../../server/security'
const sent:{to:string[];text:string}[]=[]
const password='a long original test passphrase',adminKey='a-break-glass-administrator-key-of-adequate-length'
beforeEach(()=>{sent.length=0;vi.stubGlobal('fetch',vi.fn(async(url:string,options:RequestInit)=>{expect(url).toBe('https://api.resend.com/emails');sent.push(JSON.parse(String(options.body)));return Response.json({id:crypto.randomUUID()})}))})
afterEach(()=>{vi.unstubAllGlobals()})
async function fixture(){
 const server=await testServer()
 server.env.ADMIN_KEY_SHA256=await digest(adminKey)
 async function member(username:string){
  const email=username+'@example.test'
  expect((await server.call('/auth/register','POST',{rulesVersion:COMMUNITY_RULES_VERSION,username,email,password})).status).toBe(202)
  const token=[...sent].reverse().find(message=>message.to[0]===email)!.text.match(/#account\/verify\/([^\s]+)/)![1]
  expect((await server.call('/auth/verify','POST',{token,password})).status).toBe(200)
  const login=await server.call('/auth/login','POST',{email,password});expect(login.status).toBe(200)
  const id=(server.db.prepare('SELECT id FROM users WHERE username=?').get(username) as {id:string}).id
  return {id,username,session:login.headers.get('X-Octamod-Session')!}
 }
 return {...server,member}
}
describe('administrator history records who acted',()=>{
 it('names the administrator account in moderation history and the fixed row for the key, without changing public attribution',async()=>{
  const {call,db,member}=await fixture(),author=await member('poster'),owner=await member('owner')
  db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(owner.id)
  const created=await call('/forum/threads','POST',{title:'A thread to moderate',body:'Some text.',category:'general'},author.session);expect(created.status).toBe(201)
  const thread=await created.json() as {id:string}
  const reason='Testing who is recorded.'
  expect((await call('/admin/forum/threads/'+thread.id,'PATCH',{action:'locked',value:true,reason},owner.session)).status).toBe(200)
  const opened=await call('/auth/admin','POST',{key:adminKey});expect(opened.status).toBe(200)
  const key=(await opened.json() as {token:string}).token
  expect((await call('/admin/forum/threads/'+thread.id,'PATCH',{action:'pinned',value:true,reason},'',key)).status).toBe(200)
  const history=await (await call('/admin/forum/history','GET',undefined,owner.session)).json() as {action:string;actor:string;reason:string}[]
  expect(history.slice(0,2).map(item=>[item.action,item.actor])).toEqual([['pinned:1','Octamod administrator'],['locked:1','owner']])
  expect(db.prepare('SELECT actor_id FROM forum_moderation WHERE action=?').get('locked:1')).toEqual({actor_id:owner.id})
  // A member without the role cannot read or write moderation history, and the account alone grants nothing.
  expect((await call('/admin/forum/history','GET',undefined,author.session)).status).toBe(403)
  db.prepare('UPDATE users SET is_admin=0 WHERE id=?').run(owner.id)
  expect((await call('/admin/forum/history','GET',undefined,owner.session)).status).toBe(403)
 })
})
