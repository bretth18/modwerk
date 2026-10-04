import { useEffect, useState } from 'react'
import { api } from './api'

export function AccountConfirmation({onReady}:{onReady:(ready:boolean)=>void}){
  const [method,setMethod]=useState<{passwordRequired:boolean;freshLogin:boolean}>(),[error,setError]=useState('')
  useEffect(()=>{let cancelled=false;void api<{passwordRequired:boolean;freshLogin:boolean}>('/auth/profile').then(value=>{if(!cancelled){setMethod(value);onReady(value.passwordRequired||value.freshLogin)}}).catch(error=>{if(!cancelled)setError(error instanceof Error?error.message:'Unable to confirm your account.')});return()=>{cancelled=true}},[onReady])
  if(error)return <p role="alert" className="file-error">{error}</p>
  if(!method)return <p role="status">Checking account confirmation…</p>
  return method.passwordRequired?<label>Current password<input type="password" name="password" autoComplete="current-password" required minLength={15} maxLength={128}/></label>:method.freshLogin?<p className="service-note">Your recent social sign-in confirms this request.</p>:<p className="service-note"><a href="#account/login?reauth=1">Sign in again</a> to confirm this request.</p>
}
