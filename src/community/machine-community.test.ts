import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { handleCommunity } from '../../server/transport'
import { digest } from '../../server/security'
import { COMMUNITY_MODULES } from './modules'
import { sharedConfiguration } from './forum-contract'
import { newConfiguration, configurationDevice } from '../config/workspace'

const databases:DatabaseSync[]=[]
afterEach(()=>{for(const db of databases.splice(0))db.close();vi.unstubAllGlobals()})
async function fixture(){
  const server=await testServer();databases.push(server.db)
  server.env.GITHUB_OAUTH_CLIENT_ID='test-client'
  server.env.GITHUB_OAUTH_CLIENT_SECRET='only-a-test-client-secret'
  server.env.GITHUB_OAUTH_CALLBACK_URL='https://api.example.test/api/developer/auth/callback'
  let counter=0
  async function member(username='reporter'){
    const id=crypto.randomUUID(),token=(++counter).toString(16).padStart(64,'0')
    server.db.prepare('INSERT INTO users(id,display_name,username,email_verified) VALUES(?,?,?,1)').run(id,username,username)
    server.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(await digest(token),id,Math.floor(Date.now()/1000)+600)
    return {id,token}
  }
  async function call(path:string,method='GET',body?:unknown,member='',developer='',admin='',cookie='',origin:string|null='https://octamod.test'){
    const headers=new Headers({'CF-Connecting-IP':'192.0.2.1'})
    if(origin)headers.set('Origin',origin)
    if(body!==undefined)headers.set('Content-Type','application/json')
    if(member)headers.set('Authorization','Bearer '+member)
    if(developer)headers.set('X-Modwerk-Developer',developer)
    if(admin)headers.set('X-Octamod-Admin',admin)
    if(cookie)headers.set('Cookie',cookie)
    return handleCommunity(new Request('https://api.example.test/api'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),server.env)
  }
  async function githubLogin(login='irpina',githubId=42){
    const verifier='a'.repeat(64),challenge=await digest(verifier)
    const start=await call('/developer/auth/start?challenge='+challenge);expect(start.status).toBe(302)
    const authorization=new URL(start.headers.get('Location')!),state=authorization.searchParams.get('state')!,cookie=start.headers.get('Set-Cookie')!.split(';')[0]
    vi.stubGlobal('fetch',vi.fn(async(url:string,options:RequestInit)=>{
      if(url==='https://github.com/login/oauth/access_token'){
        const body=JSON.parse(String(options.body));expect(body).toMatchObject({client_id:'test-client',code:'synthetic-code',redirect_uri:server.env.GITHUB_OAUTH_CALLBACK_URL})
        const digestBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.code_verifier)))
        expect(authorization.searchParams.get('code_challenge')).toBe(Buffer.from(digestBytes).toString('base64url'))
        return Response.json({access_token:'synthetic-github-access',token_type:'bearer'})
      }
      expect(url).toBe('https://api.github.com/graphql');expect(String(options.body)).not.toMatch(/email|repositories|mutation/)
      return Response.json({data:{viewer:{databaseId:githubId,login}}})
    }))
    const callback=await call('/developer/auth/callback?code=synthetic-code&state='+state,'GET',undefined,'','','',cookie,null);expect(callback.status).toBe(302)
    const location=callback.headers.get('Location')!,code=location.split('/complete/')[1]
    const result=await call('/developer/auth/complete','POST',{code,verifier});expect(result.status).toBe(200)
    const token=result.headers.get('X-Modwerk-Developer')!
    expect(await result.text()).not.toContain(token)
    return {token,code,verifier,state,cookie,location}
  }
  return {...server,member,call,githubLogin}
}
const details={title:'Unexpected behavior',steps:'Select the module and turn a control.',expected:'The chosen setting.',actual:'The setting changes.'}
const context={machine:'digitakt',model:'mk1',flash:'not-flashed',os:'1.53',moduleVersion:'1.0.1-experimental',modules:[{id:'digihealth',version:'1.0.1-experimental'}],keepStockFx2:null,build:''}

describe('machine-aware community',()=>{
  it('keeps same-named modules on separate machines and validates immutable snapshots',async()=>{
    const {call,member}=await fixture(),reporter=await member()
    expect(COMMUNITY_MODULES.filter(module=>module.moduleId==='digihealth').map(module=>module.id)).toEqual(['digitakt-digihealth','digitone-digihealth'])
    for(const device of ['digitakt','digitone']){
      const configuration={name:'Shared '+device,device,moduleIds:['digihealth'],moduleVersions:{digihealth:'1.0.1-experimental'},keepStockFx2:true}
      const result=await call('/forum/threads','POST',{title:configuration.name,body:'Settings to try.',category:'configs',machine:device,moduleId:device+'-digihealth',configuration},reporter.token)
      expect(await result.clone().json()).not.toHaveProperty('error');expect(result.status).toBe(201)
      const {id}=await result.json(),snapshot=(await(await call('/forum/threads/'+id)).json()).configuration
      expect(snapshot).toEqual(configuration)
      const local=newConfiguration(snapshot.name,snapshot.moduleIds,snapshot.keepStockFx2,snapshot.moduleVersions,snapshot.device)
      expect(configurationDevice(local)).toBe(device);expect(local.moduleIds).toEqual(['digihealth'])
      expect((await(await call('/forum/threads?machine='+device+'&module='+device+'-digihealth')).json()).threads).toHaveLength(1)
      expect((await call('/forum/threads','POST',{title:'Wrong machine',body:'Text',category:'modules',machine:device,moduleId:'miniverb'},reporter.token)).status).toBe(400)
      expect((await call('/forum/threads','POST',{title:'Wrong snapshot',body:'Text',category:'configs',machine:device==='digitakt'?'digitone':'digitakt',configuration},reporter.token)).status).toBe(400)
    }
    const old={name:'Old Octatrack',moduleIds:['miniverb'],moduleVersions:{miniverb:'0.1.0'},keepStockFx2:true}
    expect(sharedConfiguration(old)).toEqual(old)
    for(const extra of [{firmware:'untrusted bytes'},{device:'analog-rytm'},{device:'digitakt'},{moduleVersions:{}}])expect(()=>sharedConfiguration({...old,...extra})).toThrow()
  })
  it('accepts structured reports for both new machines without pretending they have Octatrack logs',async()=>{
    const {call,member}=await fixture(),reporter=await member()
    for(const [machine,model,os] of [['digitakt','mk1','1.53'],['digitone','mk1','1.44']]){
      const report={...details,context:{...context,machine,model,os},maintainerSharing:true}
      const result=await call('/modules/'+machine+'-digihealth/issues','POST',report,reporter.token)
      expect(await result.clone().json()).not.toHaveProperty('error');expect(result.status).toBe(201)
      for(const extra of [{log:'untrusted bytes'},{firmware:'bytes'},{logMissing:{reason:'other'}},{context:{...report.context,machine:'octatrack'}},{context:{...report.context,modules:[{id:'miniverb',version:'0.1.0'}]}},{context:{...report.context,os:'99.99'}},{context:{...report.context,keepStockFx2:true}}])expect((await call('/modules/'+machine+'-digihealth/issues','POST',{...report,...extra},reporter.token)).status).toBe(400)
    }
    expect((await call('/modules/miniverb/issues','POST',{...details,context},reporter.token)).status).toBe(400)
    const mine=await(await call('/issues/mine','GET',undefined,reporter.token)).json();expect(mine).toHaveLength(2)
    expect(mine.every((report:{maintainer_sharing:number})=>report.maintainer_sharing===1)).toBe(true)
  })
})
describe('GitHub developer claims and private report access',()=>{
  it('rejects provider failure and unverified identities, and handles denied authorization without signing in',async()=>{
    const {call,db,env}=await fixture()
    async function begin(){
      const start=await call('/developer/auth/start?challenge='+await digest('a'.repeat(64)))
      return {state:new URL(start.headers.get('Location')!).searchParams.get('state')!,cookie:start.headers.get('Set-Cookie')!.split(';')[0]}
    }
    const denied=await begin()
    const cancelled=await call('/developer/auth/callback?error=access_denied&state='+denied.state,'GET',undefined,'','','',denied.cookie,null)
    expect(cancelled.status).toBe(302);expect(cancelled.headers.get('Location')).toBe('https://octamod.test/#developer')
    for(const failure of ['network','credential','identity']){
      const flow=await begin()
      vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
        if(failure==='network')throw new Error('Private provider diagnostics')
        if(url==='https://github.com/login/oauth/access_token')return Response.json(failure==='credential'?{error:'private-provider-error'}:{access_token:'synthetic-access',token_type:'bearer'})
        return Response.json({data:{viewer:{databaseId:42,login:'not/a/github/handle'}}})
      }))
      const result=await call('/developer/auth/callback?code=synthetic-code&state='+flow.state,'GET',undefined,'','','',flow.cookie,null)
      expect(result.status).toBe(502);expect(await result.text()).not.toMatch(/Private provider|private-provider|synthetic-access/)
    }
    expect(db.prepare('SELECT COUNT(*) AS count FROM developer_sessions').get()!.count).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS count FROM users WHERE github_id IS NOT NULL').get()!.count).toBe(0)
    env.GITHUB_OAUTH_CALLBACK_URL='invalid callback'
    expect((await(await call('/developer/auth/session')).json()).available).toBe(false)
    expect((await call('/developer/auth/start?challenge='+'a'.repeat(64))).status).toBe(503)
  })
  it('rejects a wrong browser proof and expired handoffs, and permanently revokes sessions on suspension',async()=>{
    const {call,githubLogin,db}=await fixture(),login=await githubLogin()
    const user=String(db.prepare('SELECT id FROM users WHERE github_id IS NOT NULL').get()!.id),code='c'.repeat(64)
    db.prepare('INSERT INTO developer_auth_codes VALUES(?,?,?,?)').run(await digest(code),user,await digest(login.verifier),Math.floor(Date.now()/1000)+60)
    expect((await call('/developer/auth/complete','POST',{code,verifier:'b'.repeat(64)})).status).toBe(400)
    expect((await call('/developer/auth/complete','POST',{code,verifier:login.verifier})).status).toBe(200)
    db.prepare('INSERT INTO developer_auth_codes VALUES(?,?,?,0)').run(await digest(code),user,await digest(login.verifier))
    expect((await call('/developer/auth/complete','POST',{code,verifier:login.verifier})).status).toBe(400)
    const admin=(await(await call('/auth/admin','POST',{key:'e'.repeat(64)})).json()).token
    for(const value of [true,false])expect((await call('/admin/forum/users/'+user,'PATCH',{action:'suspended',value,reason:'Synthetic moderation'},'','',admin)).status).toBe(200)
    expect((await call('/developer/modules','GET',undefined,'',login.token)).status).toBe(401)
    expect(db.prepare('SELECT COUNT(*) AS count FROM developer_auth_codes').get()!.count).toBe(0)
  })
  it('gates Octatrack log downloads by module ownership and revocable consent',async()=>{
    const {call,githubLogin,member}=await fixture(),module=COMMUNITY_MODULES.find(module=>module.id==='miniverb')!,developer=await githubLogin(module.author),other=await githubLogin('irpina',43),reporter=await member()
    await call('/developer/modules/miniverb/claim','POST',{},'',developer.token)
    const log=readFileSync(new URL('../../sdk/runtime/logging/tests/expected.log',import.meta.url),'utf8')
    const result=await call('/modules/miniverb/issues','POST',{...details,context:{model:'mk2',flash:'flashed',os:'1.40C',modules:[{id:'miniverb',version:module.version}],keepStockFx2:true,build:''},log,maintainerSharing:true},reporter.token)
    expect(result.status).toBe(201)
    const report=(await(await call('/issues/mine','GET',undefined,reporter.token)).json())[0]
    expect(await(await call('/issues/'+report.id+'/log','GET',undefined,'',developer.token)).text()).toBe(log)
    expect((await call('/issues/'+report.id+'/log','GET',undefined,'',other.token)).status).toBe(404)
    await call('/issues/'+report.id,'PATCH',{maintainerSharing:false},reporter.token)
    expect((await call('/issues/'+report.id+'/log','GET',undefined,'',developer.token)).status).toBe(404)
    expect((await call('/issues/'+report.id+'/log','GET',undefined,reporter.token)).status).toBe(200)
  })
  it('binds OAuth to the starting browser and PKCE, consumes codes once, and returns no GitHub credentials',async()=>{
    const {call,githubLogin,db}=await fixture(),login=await githubLogin()
    expect((await(await call('/developer/auth/session','GET',undefined,'',login.token)).json()).user).toEqual({login:'irpina'})
    expect(JSON.stringify(db.prepare('SELECT * FROM developer_sessions').all())).not.toContain(login.token)
    expect(JSON.stringify(db.prepare('SELECT * FROM developer_sessions').all())).not.toContain('synthetic-github-access')
    expect(login.location).toMatch(/^https:\/\/octamod.test\/#developer\/complete\/[a-f0-9]{64}$/)
    expect((await call('/developer/auth/complete','POST',{code:login.code,verifier:login.verifier})).status).toBe(400)
    expect((await call('/developer/auth/callback?code=synthetic-code&state='+login.state,'GET',undefined,'','','',login.cookie,null)).status).toBe(400)
    const verifier='b'.repeat(64),start=await call('/developer/auth/start?challenge='+await digest(verifier)),state=new URL(start.headers.get('Location')!).searchParams.get('state')!
    expect((await call('/developer/auth/callback?code=synthetic-code&state='+state,'GET',undefined,'','','','',null)).status).toBe(400)
    db.exec('UPDATE developer_oauth_states SET expires=0')
    expect((await call('/developer/auth/callback?code=synthetic-code&state='+state,'GET',undefined,'','','',start.headers.get('Set-Cookie')!.split(';')[0],null)).status).toBe(400)
    expect((await call('/developer/auth/complete','POST',{code:login.code,verifier:login.verifier},'','','','','https://evil.test')).status).toBe(403)
  })
  it('lets developers claim declared modules while matching forum usernames confer no access',async()=>{
    const {call,githubLogin,member}=await fixture(),login=await githubLogin(),pretender=await member('irpina')
    const modules=await(await call('/developer/modules','GET',undefined,'',login.token)).json()
    expect(modules.map((module:{id:string})=>module.id)).toContain('digitakt-digihealth')
    expect(modules.map((module:{id:string})=>module.id)).toContain('digitone-digihealth')
    expect((await call('/developer/modules/digitakt-digihealth/claim','POST',{},pretender.token)).status).toBe(401)
    expect((await call('/developer/modules/digitakt-digisophie/claim','POST',{},'',login.token)).status).toBe(403)
    for(const id of ['digitakt-digihealth','digitone-digihealth'])expect((await call('/developer/modules/'+id+'/claim','POST',{},'',login.token)).status).toBe(201)
    expect((await call('/admin/maintainers','GET',undefined,'',login.token)).status).toBe(403)
    expect((await(await call('/auth/session','GET',undefined,'',login.token)).json()).user).toBeNull()
    expect((await call('/modules/digitakt-digihealth/rating','POST',{value:5},'',login.token)).status).toBe(401)
    const reused=await githubLogin('irpina',999)
    expect((await call('/developer/modules/digitakt-digihealth/claim','POST',{},'',reused.token)).status).toBe(409)
  })
  it('requires reporter consent, supports private replies and resolution, and immediately enforces revocation',async()=>{
    const {call,githubLogin,member,db}=await fixture(),login=await githubLogin(),reporter=await member(),stranger=await member('stranger')
    await call('/developer/modules/digitakt-digihealth/claim','POST',{},'',login.token)
    expect((await call('/modules/digitakt-digihealth/issues','POST',{...details,context},reporter.token)).status).toBe(201)
    const id=String(db.prepare('SELECT id FROM issues').get()!.id)
    expect(await(await call('/developer/issues','GET',undefined,'',login.token)).json()).toEqual([])
    expect((await call('/issues/'+id,'GET',undefined,'',login.token)).status).toBe(404)
    expect((await call('/issues/'+id,'PATCH',{maintainerSharing:true},stranger.token)).status).toBe(404)
    expect((await call('/issues/'+id,'PATCH',{maintainerSharing:true},reporter.token)).status).toBe(200)
    expect((await(await call('/developer/issues','GET',undefined,'',login.token)).json())[0].id).toBe(id)
    const detail=await(await call('/issues/'+id,'GET',undefined,'',login.token)).json();expect(detail).toMatchObject({canManage:true,canShare:false})
    expect(JSON.stringify(detail)).not.toMatch(/reporter_id|user_id|email|password|token_hash/)
    expect((await call('/issues/'+id+'/replies','POST',{body:'I can reproduce this.'},'',login.token)).status).toBe(201)
    expect((await(await call('/issues/'+id,'GET',undefined,reporter.token)).json()).replies[0].body).toBe('I can reproduce this.')
    expect((await call('/issues/'+id,'PATCH',{status:'closed'},reporter.token)).status).toBe(403)
    expect((await call('/issues/'+id,'PATCH',{status:'closed'},'',login.token)).status).toBe(200)
    expect((await call('/developer/issues?moduleId=digitakt-digisophie','GET',undefined,'',login.token)).status).toBe(403)
    await call('/issues/'+id,'PATCH',{maintainerSharing:false},reporter.token)
    expect((await call('/issues/'+id,'GET',undefined,'',login.token)).status).toBe(404)
    await call('/issues/'+id,'PATCH',{maintainerSharing:true},reporter.token)
    const admin=(await(await call('/auth/admin','POST',{key:'e'.repeat(64)})).json()).token
    const grant=db.prepare('SELECT user_id FROM module_maintainers').get()!
    expect((await call('/admin/maintainers/digitakt-digihealth/'+grant.user_id,'DELETE',{note:'Reviewed suspension'},'','',admin)).status).toBe(200)
    expect((await call('/issues/'+id+'/replies','POST',{body:'Bypass'},'',login.token)).status).toBe(404)
    expect((await call('/developer/modules/digitakt-digihealth/claim','POST',{},'',login.token)).status).toBe(403)
    const module=(await(await call('/developer/modules','GET',undefined,'',login.token)).json()).find((module:{id:string})=>module.id==='digitakt-digihealth')
    expect(module).toMatchObject({blocked:true,claimed:false,reports:{total:0,open:0}})
    expect((await call('/admin/maintainers/digitakt-digihealth/'+grant.user_id,'PATCH',{note:'Reviewed restoration'},'','',admin)).status).toBe(200)
    expect((await call('/issues/'+id,'GET',undefined,'',login.token)).status).toBe(200)
  })
  it('fails closed without configuration and invalidates sessions on logout, suspension or secret rotation',async()=>{
    const {call,githubLogin,env,db}=await fixture(),login=await githubLogin()
    env.GITHUB_OAUTH_CLIENT_SECRET='rotated-synthetic-secret'
    expect((await call('/developer/modules','GET',undefined,'',login.token)).status).toBe(401)
    env.GITHUB_OAUTH_CLIENT_SECRET='only-a-test-client-secret';db.exec('UPDATE users SET suspended=1 WHERE github_id IS NOT NULL')
    expect((await call('/developer/modules','GET',undefined,'',login.token)).status).toBe(401)
    db.exec('UPDATE users SET suspended=0')
    const ended=await call('/developer/auth/session','DELETE',undefined,'',login.token);expect(ended.headers.get('X-Modwerk-Developer')).toBe('')
    expect((await call('/developer/modules','GET',undefined,'',login.token)).status).toBe(401)
    env.GITHUB_OAUTH_CLIENT_ID=undefined
    expect((await(await call('/developer/auth/session')).json()).available).toBe(false)
    expect((await call('/developer/auth/start?challenge='+'a'.repeat(64))).status).toBe(503)
  })
})
