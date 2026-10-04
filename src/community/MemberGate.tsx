import type { ReactNode } from 'react'
import { useState } from 'react'
import { useCommunity } from './context'
import { LoginPromptDialog } from './LoginPromptDialog'
export function MemberGate({ children, action, next }: { children?: ReactNode; action: string; next: string }) {
  const { session } = useCommunity()
  const [open,setOpen]=useState(false)
  if (session.user?.verified && session.user.username) return children
  return <><section className="configuration-section member-gate"><h2>Build firmware</h2><p>Your firmware stays on this device.</p><button className="button button-primary" aria-haspopup="dialog" onClick={()=>setOpen(true)}>{action[0].toUpperCase()+action.slice(1)}</button></section>{open&&<LoginPromptDialog next={next} onClose={()=>setOpen(false)}/>}</>
}
