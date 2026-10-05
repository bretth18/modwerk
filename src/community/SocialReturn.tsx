import { BackLink } from '../components/BackLink'
import { useEffect, useRef, useState } from 'react'
import { useCommunity } from './context'
import { completeSocial, finishSocial, type SocialResult } from './social-login'
import { COMMUNITY_RULES_VERSION } from '../legal/policy'
export function SocialReturn({code}:{code:string}) {
  const {refresh}=useCommunity(),[error,setError]=useState(''),[onboarding,setOnboarding]=useState<SocialResult['onboarding']>(),[busy,setBusy]=useState(false)
  const refreshRef=useRef(refresh),codeRef=useRef(code)
  // Preserve the original single-use handoff across refreshes and StrictMode.
  useEffect(()=>{let cancelled=false;history.replaceState(null,'','#account/sso');void finishSocial(codeRef.current).then(async result=>{
    if(cancelled)return
    if(result.onboarding){setOnboarding(result.onboarding);return}
    await refreshRef.current();if(!cancelled)window.location.assign('#'+result.next)
  }).catch(error=>{if(!cancelled)setError(error instanceof Error?error.message:'Sign-in could not be completed.')});return()=>{cancelled=true}},[])
  async function submit(form:HTMLFormElement){
    setBusy(true);setError('')
    const fields=new FormData(form)
    try {
      const next=await completeSocial({username:String(fields.get('username')??''),rulesVersion:fields.get('rulesAccepted')==='on'?COMMUNITY_RULES_VERSION:'',newsletter:fields.get('newsletter')==='on'})
      await refreshRef.current();window.location.assign('#'+next)
    }catch(error){setError(error instanceof Error?error.message:'Your account could not be created.')}finally{setBusy(false)}
  }
  return <div className="community-page account-page"><BackLink href="#account/login">Sign in</BackLink><section className="configuration-section">
    <h1>{onboarding?'Finish creating your account':'Completing sign-in'}</h1>
    {onboarding?<><p>Your social account is verified. Choose the public username that will appear with your posts. We suggested one; edit it if you like.</p><form className="community-form" onSubmit={event=>{event.preventDefault();void submit(event.currentTarget)}}>
      <label>Public username<input name="username" defaultValue={onboarding.username} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" spellCheck={false}/><small>3–24 letters, numbers or underscores. Your email and provider profile stay private.</small></label>
      <p className="service-note">We send a welcome email once you complete signup. Read the <a href="#privacy" target="_blank" rel="noopener noreferrer">privacy notice</a> and <a href="#impressum" target="_blank" rel="noopener noreferrer">Impressum</a>.</p>
      <label className="risk-accept"><input name="rulesAccepted" type="checkbox" required/><span>I agree to the <a href="#community-rules" target="_blank" rel="noopener noreferrer">community rules</a>.</span></label>
      <label className="risk-accept"><input name="newsletter" type="checkbox"/><span>Email me occasional Modwerk news and updates (optional).</span></label>
      <button className="button button-primary" disabled={busy}>{busy?'Creating account…':'Create account and continue'}</button>
    </form>{error&&<p className="file-error" role="alert">{error}</p>}</>:error?<><p className="file-error" role="alert">{error}</p><a className="button button-primary" href="#account/login">Start sign-in again</a></>:<p role="status">Please wait…</p>}
  </section></div>
}
