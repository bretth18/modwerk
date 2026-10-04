import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { NEWS_CONSENT_VERSION } from '../../server/news-preferences'

const databases: DatabaseSync[] = [], sent: {to:string[];text:string}[] = []
const password = 'a long original test passphrase'
beforeEach(() => {
  sent.length = 0
  vi.stubGlobal('fetch', vi.fn(async (url:string, options:RequestInit) => {
    expect(url).toBe('https://api.resend.com/emails')
    sent.push(JSON.parse(String(options.body)))
    return Response.json({id:crypto.randomUUID()})
  }))
})
afterEach(() => { vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close() })
async function fixture(newsletter?: boolean) {
  const server = await testServer(); databases.push(server.db)
  const email = 'newsreader@example.test'
  const registered = await server.call('/auth/register', 'POST', {username:'newsreader', email, password, rulesVersion:COMMUNITY_RULES_VERSION, ...(newsletter === undefined ? {} : {newsletter})})
  expect(registered.status).toBe(202)
  const token = sent.at(-1)!.text.match(/#account\/verify\/([^\s]+)/)![1]
  expect((await server.call('/auth/verify', 'POST', {token,password})).status).toBe(200)
  const login = await server.call('/auth/login', 'POST', {email,password})
  expect(login.status).toBe(200)
  return {...server, email, token:login.headers.get('X-Octamod-Session')!}
}
it('defaults to no news and requires a verified signed-in account for preferences', async () => {
  const {call,token} = await fixture()
  expect((await call('/auth/news')).status).toBe(401)
  expect((await call('/auth/news','PATCH',{enabled:true})).status).toBe(401)
  expect((await call('/auth/news','PATCH',{enabled:true},token+'tampered')).status).toBe(401)
  expect(await (await call('/auth/news','GET',undefined,token)).json()).toMatchObject({enabled:false})
})
it('records explicit signup consent, preserves it on duplicate signup and permits withdrawal', async () => {
  const {call,db,token,email} = await fixture(true)
  expect(db.prepare('SELECT enabled,consent_version FROM account_news_preferences').get()).toEqual({enabled:1,consent_version:NEWS_CONSENT_VERSION})
  expect((await call('/auth/register','POST',{username:'anotheruser',email,password,newsletter:false,rulesVersion:COMMUNITY_RULES_VERSION})).status).toBe(202)
  expect(await (await call('/auth/news','GET',undefined,token)).json()).toMatchObject({enabled:true})
  expect((await call('/auth/news','PATCH',{enabled:false},token)).status).toBe(200)
  expect(db.prepare('SELECT enabled,consent_version FROM account_news_preferences').get()).toEqual({enabled:0,consent_version:null})
  expect((await call('/modules/miniverb/like','POST',{liked:true},token)).status).toBe(200)
})
it('rejects invalid consent and cross-origin changes without exposing email or changing another account', async () => {
  const {call,token,email} = await fixture()
  expect((await call('/auth/news','PATCH',{enabled:'yes'},token)).status).toBe(400)
  expect((await call('/auth/news','PATCH',{enabled:true},token,'','https://other.test')).status).toBe(403)
  const response = await call('/auth/news','PATCH',{enabled:true,userId:'someone-else'},token)
  expect(response.status).toBe(200)
  expect(await response.text()).not.toContain(email)
})
