import { useEffect, useRef, useState } from 'react'
import { useCommunity } from './context'
import { finishSocial } from './social-login'
export function SocialReturn({code}:{code:string}) {
  const {refresh}=useCommunity(),[error,setError]=useState('')
  const refreshRef=useRef(refresh),codeRef=useRef(code)
  // Refreshing the session rerenders the router after the sensitive code is
  // removed from the URL. Keep the original code for this mounted return flow.
  useEffect(()=>{let cancelled=false;history.replaceState(null,'','#account/sso');void finishSocial(codeRef.current).then(async next=>{if(cancelled)return;await refreshRef.current();if(!cancelled)window.location.assign('#'+next)}).catch(error=>{if(!cancelled)setError(error instanceof Error?error.message:'Sign-in could not be completed.')});return()=>{cancelled=true}},[])
  return <div className="community-page account-page"><section className="configuration-section"><h1>Completing sign-in</h1>{error?<><p className="file-error" role="alert">{error}</p><a className="button button-primary" href="#account/login">Start sign-in again</a></>:<p role="status">Please wait…</p>}</section></div>
}
