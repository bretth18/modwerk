import { useState } from 'react'
import type { LinkState, OctatrackLink } from '../engine/elekloader/octatrack-link'
import { useOctatrackLink } from '../hooks/useOctatrackLink'
import { Icon } from './Icon'
import './octatrack-link.css'

const ACTIVE: LinkState['status'][] = ['sending', 'testing', 'trial', 'finishing']
const activity = ({ status, progress = 0 }: LinkState) => status === 'sending' ? `Syncing ${Math.round(progress * 100)}%`
  : status === 'testing' ? 'Self-test' : status === 'trial' ? 'Waiting for Keep or Undo' : 'Finishing'

/** The beta sidebar's next step, instead of asking for an OS file on every visit. */
export function OctatrackSidebarStatus({ link, onInstall }: { link: OctatrackLink; onInstall: () => void }) {
  const state = useOctatrackLink(link), { status, identity } = state
  const active = ACTIVE.includes(status), connected = status === 'ready' && !!identity?.canSubmit
  const install = status === 'stock' || status === 'ready' && !connected || status === 'unsupported'
  const title = active ? activity(state) : connected ? 'Octatrack connected' : install ? 'Install the base' : status === 'connecting' ? 'Connecting…' : status === 'busy' ? 'Try connecting again' : 'Connect Octatrack'
  const hint = active ? 'Open your module set to follow the sync.' : connected ? 'Choose a module set to sync.' : status === 'stock' ? 'Original OS detected. Install once from the card.' : install ? 'Install from the card to get started.' : status === 'busy' ? 'Close the other tab or app using it.' : 'Plug in USB, then choose your Octatrack.'
  const content = <><span className={'status-dot' + (connected ? ' verified' : active ? ' is-live' : '')} /><span className="sidebar-build-copy"><strong>{title}</strong><small>{hint}</small></span><Icon name="arrow" size={14} /></>
  return connected || active ? <a className="sidebar-build" href="#configuration">{content}</a>
    : <button type="button" className="sidebar-build is-connection" disabled={status === 'connecting'} onClick={() => { if (install) onInstall(); else void (status === 'busy' ? link.retry() : link.connect()) }}>{content}</button>
}

/** The Octatrack's connection in the status bar; nothing while idle or without WebUSB. */
export function OctatrackStatus({ link }: { link: OctatrackLink }) {
  const state = useOctatrackLink(link), { status, identity } = state
  if (status === 'unsupported' || status === 'idle' || status === 'connecting') return null
  const busy = ACTIVE.includes(status)
  return <span className="octatrack-status-bar"><span className={'status-dot' + (busy ? ' is-live' : identity?.canSubmit ? ' verified' : '')} />{busy ? 'Syncing to Octatrack · ' + activity(state) : status === 'busy' ? 'Octatrack in use' : 'Octatrack connected'}</span>
}

/** A pill while an update runs or waits for Keep or Undo, and for its result, on every page but the configuration page. */
export function OctatrackActivity({ link }: { link: OctatrackLink }) {
  const state = useOctatrackLink(link), { status, module, notice } = state
  const [dismissed, setDismissed] = useState<LinkState['notice']>()
  const result = notice && notice !== dismissed && !ACTIVE.includes(status) ? notice : undefined
  if (!ACTIVE.includes(status) && !result) return null
  return <aside className={'octatrack-activity' + (result?.tone === 'error' ? ' is-error' : '')} aria-label="Octatrack update" role="status">
    {result ? <><span>{result.text}</span><button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setDismissed(notice)}><Icon name="close" size={15} /></button></>
      : <><span className="status-dot is-live" /><span><strong>{module}</strong> · {activity(state)}</span>
        {(status === 'trial' || status === 'finishing') && <><button type="button" className="button button-primary" disabled={status === 'finishing'} onClick={() => void link.keep()}>Keep</button><button type="button" className="button button-quiet" disabled={status === 'finishing'} onClick={() => void link.undo()}>Undo</button></>}
        <a className="text-button" href="#configuration">Open</a></>}
  </aside>
}
