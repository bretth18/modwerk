import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { hashPassword } from 'better-auth/crypto'
import { testServer } from './test-server'
import { handleCommunity } from '../../server/transport'
import { digest } from '../../server/security'
import type { SocialProvider } from '../../server/social-config'

const databases: DatabaseSync[] = []
afterEach(() => { vi.unstubAllGlobals(); for(const db of databases.splice(0)) db.close() })
async function fixture() {
  const server = await testServer(); databases.push(server.db)
  const {env,call} = server
  env.AUTH_BASE_URL = 'https://api.example.test/api/auth'
  env.SSO_GOOGLE_CLIENT_ID = 'synthetic-google'; env.SSO_GOOGLE_CLIENT_SECRET = 'synthetic-secret'
  env.SSO_GITHUB_CLIENT_ID = 'synthetic-github'; env.SSO_GITHUB_CLIENT_SECRET = 'synthetic-secret'
  env.SSO_DISCORD_CLIENT_ID = 'synthetic-discord'; env.SSO_DISCORD_CLIENT_SECRET = 'synthetic-secret'
  let email = 'member@example.test', verified = true, identity = '42', nonce = '', invalidSignature = false
  const keys = generateKeyPairSync('rsa',{modulusLength:2048}), jwk = {...keys.publicKey.export({format:'jwk'}),kid:'synthetic',alg:'RS256',use:'sig'}
  vi.stubGlobal('fetch',vi.fn(async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    if(url.includes('oauth2/v3/certs')) return Response.json({keys:[jwk]})
    if(url.includes('oauth2.googleapis.com/token')) {
      const header = Buffer.from(JSON.stringify({alg:'RS256',kid:'synthetic',typ:'JWT'})).toString('base64url')
      const body = Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:'synthetic-google',sub:identity,email,email_verified:verified,name:'Private provider name',picture:'https://example.test/private.jpg',nonce,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600})).toString('base64url')
      const signature=sign('RSA-SHA256',Buffer.from(header+'.'+body),keys.privateKey).toString('base64url')
      const jwt = header+'.'+body+'.'+(invalidSignature?'a'.repeat(signature.length):signature)
      return Response.json({access_token:'synthetic-access',id_token:jwt,token_type:'Bearer',expires_in:3600})
    }
    if(url.includes('oauth/access_token') || url.includes('/oauth2/token')) return Response.json({access_token:'synthetic-access',token_type:'Bearer',expires_in:3600,scope:'identify email read:user user:email'})
    if(url.endsWith('/user/emails')) return Response.json([{email,primary:true,verified}])
    if(url.endsWith('/user')) return Response.json({id:Number(identity),login:'provider_handle',name:'Private provider name',email,avatar_url:'https://example.test/private.jpg'})
    if(decodeURIComponent(url).endsWith('/users/@me')) return Response.json({id:identity,username:'provider_handle',global_name:'Private provider name',avatar:'synthetic-avatar',discriminator:'0',email,verified})
    if(url==='https://api.resend.com/emails') return Response.json({id:'synthetic-mail'})
    throw new Error('Unexpected provider request: '+url)
  }))
  async function begin(provider: SocialProvider, mode: 'login'|'register' = 'register', username = 'member') {
    const verifier = 'a'.repeat(64)
    const initial = await call('/auth/sso','POST',{provider,mode,username,challenge:await digest(verifier)},'','',new URL(env.APP_URL!).origin)
    expect(initial.status).toBe(200)
    const {url} = await initial.json(), start = await handleCommunity(new Request(url),env)
    expect(start.status).toBe(302)
    const authorization = new URL(start.headers.get('Location')!)
    expect(authorization.searchParams.get('redirect_uri')).toBe(env.AUTH_BASE_URL+'/callback/'+provider)
    nonce = authorization.searchParams.get('nonce') ?? ''
    const cookie = start.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')
    const callback = env.AUTH_BASE_URL+'/callback/'+provider+'?code=synthetic-code&state='+encodeURIComponent(authorization.searchParams.get('state')!)
    return {verifier,callback,cookie,startUrl:url}
  }
  async function complete(provider: SocialProvider, mode: 'login'|'register' = 'register', username = 'member') {
    const pending = await begin(provider,mode,username)
    const callback = await handleCommunity(new Request(pending.callback,{headers:{Cookie:pending.cookie}}),env)
    expect(callback.status).toBe(302)
    const location = new URL(callback.headers.get('Location')!)
    expect(location.hash).toMatch(/^#account\/sso\/[a-f0-9]{64}$/)
    expect(callback.headers.get('set-cookie')).toBeNull()
    const code = location.hash.split('/')[2]
    return {...pending,code}
  }
  async function member(provider: SocialProvider = 'github', username = 'member') {
    const pending = await complete(provider,'register',username), result = await call('/auth/sso/exchange','POST',{code:pending.code,verifier:pending.verifier})
    expect(result.status).toBe(200)
    return result.headers.get('X-Octamod-Session')!
  }
  return {...server,begin,complete,member,invalidateSignature:()=>{invalidSignature=true},setIdentity:(value:string,address:string,isVerified=true)=>{identity=value;email=address;verified=isVerified}}
}
describe('social account sign-in',()=>{
  it.each(['google','github','discord'] as const)('signs up with %s, using the chosen public identity and private signed session',async provider=>{
    const {call,db,member,complete}=await fixture(),session=await member(provider)
    expect(session).toContain('.')
    const own=await(await call('/auth/session','GET',undefined,session)).json()
    expect(own).toMatchObject({admin:false,user:{username:'member',verified:true,displayName:'member'}})
    expect(JSON.stringify(own)).not.toMatch(/member@example|Private provider|synthetic-secret/)
    expect(db.prepare('SELECT name,image FROM auth_users').get()).toEqual({name:'member',image:null})
    expect((await call('/auth/build-access','POST',{},session)).status).toBe(200)
    const returning=await complete(provider,'login')
    expect((await call('/auth/sso/exchange','POST',{code:returning.code,verifier:returning.verifier})).status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS count FROM auth_users').get()).toEqual({count:1})
  })
  it('supports the same-origin HttpOnly cookie session fallback',async()=>{
    const f=await fixture()
    f.env.APP_URL='https://api.example.test/'
    f.env.SESSION_TRANSPORT=undefined
    const pending=await f.complete('discord'),exchange=await f.call('/auth/sso/exchange','POST',{code:pending.code,verifier:pending.verifier},'','','https://api.example.test')
    expect(exchange.status).toBe(200)
    expect(exchange.headers.get('X-Octamod-Session')).toBeNull()
    const cookies=exchange.headers.getSetCookie()
    expect(cookies.some(value=>value.includes('HttpOnly')&&value.includes('Secure'))).toBe(true)
    const request=new Request('https://api.example.test/api/auth/build-access',{method:'POST',headers:{Origin:'https://api.example.test',Cookie:cookies.map(value=>value.split(';')[0]).join('; '),'Content-Type':'application/json'},body:'{}'})
    expect((await handleCommunity(request,f.env)).status).toBe(200)
  })
  it('rejects missing state cookies, handoff theft, replay and expiry',async()=>{
    const {begin,complete,call,env,db}=await fixture(),start=await begin('github')
    const missing=await handleCommunity(new Request(start.callback),env)
    expect(new URL(missing.headers.get('Location')!).hash).toBe('#account/sso-error')
    expect(db.prepare('SELECT COUNT(*) AS count FROM auth_users').get()).toEqual({count:0})
    expect((await handleCommunity(new Request(start.startUrl),env)).status).toBe(400)
    const pending=await complete('github')
    const body={code:pending.code,verifier:pending.verifier}
    expect(JSON.stringify(db.prepare('SELECT * FROM social_flows').all())).not.toContain(pending.code)
    expect((await call('/auth/sso/exchange','POST',{...body,verifier:'b'.repeat(64)})).status).toBe(400)
    expect((await call('/auth/sso/exchange','POST',body)).status).toBe(200)
    expect((await call('/auth/sso/exchange','POST',body)).status).toBe(400)
    const expired=await complete('github','login');db.exec('UPDATE social_flows SET expires=0')
    expect((await call('/auth/sso/exchange','POST',{code:expired.code,verifier:expired.verifier})).status).toBe(400)
  })
  it('rejects a Google ID token with an invalid signature',async()=>{
    const f=await fixture(),pending=await f.begin('google')
    f.invalidateSignature()
    const denied=await handleCommunity(new Request(pending.callback,{headers:{Cookie:pending.cookie}}),f.env)
    expect(new URL(denied.headers.get('Location')!).hash).toBe('#account/sso-error')
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM auth_users').get()).toEqual({count:0})
  })
  it('rechecks registration policy on the callback',async()=>{
    const f=await fixture(),pending=await f.begin('github')
    f.env.REGISTRATION_OPEN='false'
    const denied=await handleCommunity(new Request(pending.callback,{headers:{Cookie:pending.cookie}}),f.env)
    expect(new URL(denied.headers.get('Location')!).hash).toBe('#account/sso-error')
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM auth_users').get()).toEqual({count:0})
  })
  it('requires verified provider email, refuses implicit email linking, and respects registration closure',async()=>{
    const f=await fixture(),existing=await f.member('github')
    f.setIdentity('42','member@example.test',false)
    const unverified=await f.begin('github','login'), denied=await handleCommunity(new Request(unverified.callback,{headers:{Cookie:unverified.cookie}}),f.env)
    expect(new URL(denied.headers.get('Location')!).hash).toBe('#account/sso-error')
    f.setIdentity('another','member@example.test')
    const linking=await f.begin('discord','register','newhandle'), refused=await handleCommunity(new Request(linking.callback,{headers:{Cookie:linking.cookie}}),f.env)
    expect(new URL(refused.headers.get('Location')!).hash).toBe('#account/sso-error')
    f.env.REGISTRATION_OPEN='false'
    expect((await f.call('/auth/sso','POST',{provider:'github',mode:'register',username:'newmember',challenge:'a'.repeat(64)})).status).toBe(503)
    expect((await f.call('/auth/build-access','POST',{},existing)).status).toBe(200)
  })
  it('fails closed without credentials and never exposes arbitrary Better Auth endpoints',async()=>{
    const {call,env}=await fixture()
    env.SSO_GITHUB_CLIENT_SECRET=undefined
    expect((await(await call('/auth/session')).json()).ssoProviders).toEqual(['google','discord'])
    expect((await call('/auth/sso','POST',{provider:'github',mode:'login',challenge:'a'.repeat(64)})).status).toBe(400)
    expect((await call('/auth/sign-in/social','POST',{provider:'google'})).status).toBe(404)
    expect((await call('/auth/sso','POST',{provider:'google',mode:'login',challenge:'a'.repeat(64)},'','','https://evil.example')).status).toBe(403)
    env.AUTH_BASE_URL=undefined
    expect((await call('/auth/sso','POST',{provider:'google',mode:'login',challenge:'a'.repeat(64)})).status).toBe(503)
    env.AUTH_BASE_URL='http://api.example.test/api/auth'
    expect((await(await call('/auth/session')).json()).ssoProviders).toEqual([])
    env.AUTH_BASE_URL='https://api.example.test/wrong-path'
    expect((await(await call('/auth/session')).json()).ssoProviders).toEqual([])
  })
})
describe('profile editing and self-service account deletion',()=>{
  it('updates only the owner’s public profile, preserves email and rejects duplicate/reserved usernames',async()=>{
    const f=await fixture(),first=await f.member('github','first')
    f.setIdentity('43','second@example.test');const second=await f.member('github','second')
    const profile={username:'Renamed',displayName:'New display',bio:'Original bio',userId:'other'}
    expect((await f.call('/auth/profile','PATCH',profile,first)).status).toBe(200)
    expect(await(await f.call('/auth/profile','GET',undefined,first)).json()).toMatchObject({username:'renamed',displayName:'New display',bio:'Original bio',email:'member@example.test'})
    expect(await(await f.call('/auth/profile','GET',undefined,second)).json()).toMatchObject({username:'second',email:'second@example.test'})
    expect((await f.call('/auth/profile','PATCH',{...profile,username:'second'},first)).status).toBe(409)
    expect((await f.call('/auth/profile','PATCH',{...profile,username:'modwerk'},first)).status).toBe(400)
    expect((await f.call('/auth/profile','PATCH',profile)).status).toBe(401)
  })
  it('deletes private data and all sessions while keeping anonymized discussions and other members',async()=>{
    const f=await fixture(),first=await f.member('github','first'),profile=await(await f.call('/auth/profile','GET',undefined,first)).json()
    const own=await(await f.call('/auth/session','GET',undefined,first)).json(),id=own.user.id
    const created=await f.call('/forum/threads','POST',{title:'A shared discussion',body:'Keep the conversation',category:'general'},first),thread=(await created.json()).id
    expect(created.status).toBe(201)
    f.setIdentity('43','second@example.test');const second=await f.member('github','second')
    await f.call('/modules/miniverb/rating','POST',{value:5},first)
    expect((await f.call('/auth/account','DELETE',{confirm:'no'},first)).status).toBe(400)
    expect(profile.passwordRequired).toBe(false)
    expect((await f.call('/auth/account','DELETE',{confirm:'DELETE'},first)).status).toBe(200)
    expect(f.db.prepare('SELECT id FROM auth_users WHERE id=?').get(id)).toBeUndefined()
    expect(f.db.prepare('SELECT id FROM auth_sessions WHERE userId=?').get(id)).toBeUndefined()
    expect(f.db.prepare('SELECT * FROM ratings WHERE user_id=?').get(id)).toBeUndefined()
    expect(f.db.prepare('SELECT username,display_name,suspended FROM users WHERE id=?').get(id)).toEqual({username:null,display_name:'Deleted member',suspended:1})
    expect((await f.call('/auth/build-access','POST',{},first)).status).toBe(401)
    expect((await f.call('/auth/profile','GET',undefined,first)).status).toBe(401)
    expect((await f.call('/forum/threads/'+thread)).status).toBe(200)
    expect((await(await f.call('/forum/threads/'+thread)).json()).posts[0].username).toBeNull()
    expect((await f.call('/auth/build-access','POST',{},second)).status).toBe(200)
    expect(await(await f.call('/auth/profile','GET',undefined,second)).json()).toMatchObject({username:'second',email:'second@example.test'})
  })
  it('requires a recent social login or the correct password for deletion',async()=>{
    const f=await fixture(),session=await f.member(),own=await(await f.call('/auth/session','GET',undefined,session)).json()
    f.db.exec('UPDATE auth_sessions SET createdAt=0')
    expect((await f.call('/auth/account','DELETE',{confirm:'DELETE'},session)).status).toBe(403)
    const password='original sufficiently long password'
    f.db.prepare('INSERT INTO auth_accounts(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)').run('credential',own.user.id,'credential',own.user.id,await hashPassword(password),Date.now(),Date.now())
    expect((await f.call('/auth/account','DELETE',{confirm:'DELETE',password:'wrong password'},session)).status).toBe(403)
    expect((await f.call('/auth/account','DELETE',{confirm:'DELETE',password},session)).status).toBe(200)
  })
  it('keeps forum reading public and requires a current member for interaction and building',async()=>{
    const f=await fixture(),session=await f.member()
    expect((await f.call('/forum/threads')).status).toBe(200)
    expect((await f.call('/auth/build-access','POST',{})).status).toBe(401)
    for(const [path,body] of [['/modules/miniverb/comments',{body:'A comment'}],['/modules/miniverb/rating',{value:5}],['/forum/threads',{title:'Thread',body:'Text',category:'general'}]] as const)expect((await f.call(path,'POST',body)).status).toBe(401)
    f.db.exec('UPDATE auth_sessions SET expiresAt=0')
    expect((await f.call('/auth/build-access','POST',{},session)).status).toBe(401)
  })
})
