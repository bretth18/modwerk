import { useEffect, useRef, useState } from 'react'
import { api, post } from './api'
import { apiUrl } from '../hosting'
import { useCommunity } from './context'

const verifierKey='modwerk.developer.sign-in'
export function DeveloperVerification({route}:{route:string}) {
  const {developer,refreshDeveloper}=useCommunity()
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const complete=route.startsWith('account/developer/complete/'),unlisted=route==='account/developer/unlisted'
  const completing=useRef(false)
  useEffect(()=>{
    if(!complete){completing.current=false;return}
    if(completing.current)return
    completing.current=true
    const code=route.split('/')[3]
    history.replaceState(null,'','#account/developer/complete')
    void (async()=>{
      try {
        const verifier=sessionStorage.getItem(verifierKey)
        await post('/developer/auth/complete',{code,verifier})
        sessionStorage.removeItem(verifierKey)
        await refreshDeveloper()
        window.location.assign('#developer')
      } catch(error){setError(error instanceof Error?error.message:'Unable to verify your developer account.')}
    })()
  },[complete,route,refreshDeveloper])
  async function verify(){
    setBusy(true);setError('')
    try {
      const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('')
      sessionStorage.setItem(verifierKey,verifier)
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))),challenge=Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('')
      window.location.assign(apiUrl('/developer/auth/start?challenge='+challenge))
    } catch(error){setError(error instanceof Error?error.message:'Unable to start GitHub verification.');setBusy(false)}
  }
  async function signOut(){
    setBusy(true);setError('')
    try{await api('/developer/auth/session',{method:'DELETE'});await refreshDeveloper()}
    catch(error){setError(error instanceof Error?error.message:'Unable to sign out of your developer account.')}
    finally{setBusy(false)}
  }
  return <section className="configuration-section" aria-labelledby="developer-verification"><h2 id="developer-verification">Developer account</h2>
    {unlisted&&<p className="service-note" role="status">This GitHub account is not listed as an author or maintainer of a module in the catalog. Developer access becomes available after a reviewed module lists your GitHub handle.</p>}
    {error&&<p className="file-error" role="alert">{error}</p>}
    {complete?<><p role="status">{error?'GitHub verification could not finish.':'Verifying your GitHub account…'}</p>{error&&<a className="button button-quiet" href="#account/developer">Try again</a>}</>:!developer?<p role="status">Checking developer verification…</p>:developer.user?<><p className="success-note">Verified developer: @{developer.user.login}</p><div className="forum-actions"><a className="button button-primary" href="#developer">Developer workspace</a><button className="button button-quiet" disabled={busy} onClick={()=>void signOut()}>Sign out of developer account</button></div></>:<><p>Verify with GitHub to manage your modules. Your GitHub login must match an author or maintainer listed in the module catalog. Your community username does not verify developer access.</p><button className="button button-primary" disabled={!developer.available||busy} onClick={()=>void verify()}>{busy?'Opening GitHub…':'Verify developer account with GitHub'}</button>{!developer.available&&<p className="service-note">GitHub developer verification is not available yet.</p>}</>}
  </section>
}
