import type { ReactNode } from 'react'
import { useState } from 'react'
import { useCommunity } from './context'
import { LoginPromptDialog } from './LoginPromptDialog'
import { Icon } from '../components/Icon'
export function MemberGate({ children, action, next }: { children?: ReactNode; action: string; next: string }) {
  const { session } = useCommunity()
  const [open,setOpen]=useState(false)
  if (session.user?.verified && session.user.username) return children
  return <>
    <section className="build-section member-gate" aria-labelledby="build-access-title">
      <div>
        <h2 id="build-access-title">Build firmware</h2>
        <p>Sign in to build your firmware. Your files stay on this device.</p>
      </div>
      <div className="build-actions">
        <button className="button button-primary" aria-haspopup="dialog" onClick={()=>setOpen(true)}><Icon name="sliders" size={16}/>{action[0].toUpperCase()+action.slice(1)}</button>
      </div>
    </section>
    {open&&<LoginPromptDialog next={next} onClose={()=>setOpen(false)}/>}
  </>
}
