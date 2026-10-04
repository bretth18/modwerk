import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../hosting'
import { COMMUNITY_RULES_VERSION } from '../legal/policy'
const requests=vi.hoisted(()=>({post:vi.fn()}))
vi.mock('./api',()=>({post:requests.post}))
let store:Map<string,string>,assign:ReturnType<typeof vi.fn>
beforeEach(()=>{
  vi.resetModules();requests.post.mockReset();store=new Map();assign=vi.fn()
  vi.stubGlobal('sessionStorage',{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value),removeItem:(key:string)=>store.delete(key)})
  vi.stubGlobal('window',{location:{href:'https://modwerk.test/',assign}})
})
afterEach(()=>vi.unstubAllGlobals())
function pending(){store.set('modwerk.social.pending',JSON.stringify({verifier:'a'.repeat(64),next:'digitakt/configuration',expires:Date.now()+600000}))}
describe('browser-bound social onboarding',()=>{
  it('starts authentication without username or consent fields and validates the navigation origin',async()=>{
    const origin=new URL(apiUrl('/auth/sso'),'https://modwerk.test/').origin,url=origin+'/api/auth/sso/start/'+'b'.repeat(64)
    requests.post.mockResolvedValueOnce({url})
    const {startSocial}=await import('./social-login')
    await startSocial('google','digitakt/configuration')
    expect(requests.post).toHaveBeenCalledWith('/auth/sso',expect.objectContaining({provider:'google',mode:'login',challenge:expect.stringMatching(/^[a-f0-9]{64}$/)}))
    expect(requests.post.mock.calls[0][1]).not.toHaveProperty('username')
    expect(assign).toHaveBeenCalledWith(url)
    requests.post.mockResolvedValueOnce({url:'https://untrusted.example/api/auth/sso/start/'+'c'.repeat(64)})
    await expect(startSocial('discord','forum')).rejects.toThrow('not accepted')
    expect(assign).toHaveBeenCalledTimes(1)
  })
  it('redeems once under StrictMode, restores onboarding on reload and retains proof until confirmation',async()=>{
    pending()
    const onboarding={code:'b'.repeat(64),username:'member_0123456789ab'}
    requests.post.mockResolvedValueOnce({onboarding})
    const first=await import('./social-login'),one=first.finishSocial('c'.repeat(64)),two=first.finishSocial('c'.repeat(64))
    expect(one).toBe(two)
    expect(await one).toEqual({next:'digitakt/configuration',onboarding})
    expect(requests.post).toHaveBeenCalledTimes(1)
    vi.resetModules()
    const restored=await import('./social-login')
    expect(await restored.finishSocial('')).toEqual({next:'digitakt/configuration',onboarding})
    expect(requests.post).toHaveBeenCalledTimes(1)
    requests.post.mockResolvedValueOnce({ok:true})
    expect(await restored.completeSocial({username:'',rulesVersion:COMMUNITY_RULES_VERSION,newsletter:false})).toBe('digitakt/configuration')
    expect(requests.post).toHaveBeenLastCalledWith('/auth/sso/complete',{code:onboarding.code,verifier:'a'.repeat(64),username:'',rulesVersion:COMMUNITY_RULES_VERSION,newsletter:false})
    expect(store.has('modwerk.social.pending')).toBe(false)
  })
  it('rejects expired browser proof without sending a redemption request',async()=>{
    store.set('modwerk.social.pending',JSON.stringify({verifier:'a'.repeat(64),next:'forum',expires:0}))
    const {finishSocial}=await import('./social-login')
    await expect(finishSocial('c'.repeat(64))).rejects.toThrow('expired')
    expect(requests.post).not.toHaveBeenCalled()
  })
})
