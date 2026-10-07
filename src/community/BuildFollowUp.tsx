import { useId, useState } from 'react'
import { Icon } from '../components/Icon'
import { threadHref } from '../routing'
import { post } from './api'
import { HARDWARE_NOTE_LIMIT, hardwareReportBody, type BuiltModule } from './build-follow-up'
import { useCommunity } from './context'
import { moduleIssueHref, moduleThreadId } from './modules'
import { updateHardwareFeedback } from './hardware-feedback'

const errorText = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.'

/** Shown once a build is downloaded: tell each module's thread how it runs on the unit.
 * The build panels sit behind the member gate, so only verified members see it. */
export function BuildFollowUp({ machine, os, modules, pendingIds, onPosted }: { machine: string; os: string; modules: readonly BuiltModule[]; pendingIds?: readonly string[]; onPosted?: (href: string) => void }) {
  const { session } = useCommunity()
  const heading = useId()
  if (!modules.length || !session.user?.verified) return null
  const several = modules.length > 1
  return <section className="configuration-section build-follow-up" aria-labelledby={heading}>
    <div className="section-title"><h2 id={heading}>After you flash</h2></div>
    <p className="service-note">Local checks can’t prove a build on hardware. Once you’ve played with it, tell others how {several ? 'these modules run' : 'this module runs'} on your {machine}. Every report helps the next person decide.</p>
    <ul className="build-follow-up-list">{modules.filter(module => !pendingIds || pendingIds.includes(module.id)).map(module => <HardwareReport key={module.id} memberId={session.user!.id} machine={machine} os={os} module={module} build={modules} onPosted={onPosted} />)}</ul>
  </section>
}

/** “Works” opens a short note that posts to the module's thread; a problem goes to the module's issue form instead. */
function HardwareReport({ memberId, machine, os, module, build, onPosted }: { memberId: string; machine: string; os: string; module: BuiltModule; build: readonly BuiltModule[]; onPosted?: (href: string) => void }) {
  const [open, setOpen] = useState(false), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [posted, setPosted] = useState(''), field = useId()
  const thread = moduleThreadId(module.id)
  async function submit() {
    setBusy(true); setError('')
    try {
      const result = await post<{ id: string; page: number }>('/forum/threads/' + thread + '/replies', { body: hardwareReportBody(machine, os, module, build, note) })
      const href = threadHref(thread, module.name + ' discussion', '?page=' + result.page + '&post=' + result.id)
      setPosted(href); setOpen(false); onPosted?.(href)
      updateHardwareFeedback(memberId, { machine, os, modules: build }, { completed: module.id })
    } catch (error) { setError(errorText(error)) }
    finally { setBusy(false) }
  }
  return <li className="build-follow-up-module">
    <div className="build-follow-up-row">
      <span><strong>{module.name}</strong> <span className="subtle">{module.version}</span></span>
      {posted ? <a className="text-button" href={posted}><Icon name="check" size={14} />Posted · see the discussion</a>
        : <div className="forum-actions">
          <button type="button" className={'button ' + (open ? 'button-added' : 'button-quiet')} aria-expanded={open} aria-controls={field} onClick={() => setOpen(value => !value)}><Icon name="check" size={15} />Works on my {machine}</button>
          <a className="button button-quiet" href={moduleIssueHref(module.id)}>Report a problem</a>
        </div>}
    </div>
    {open && !posted && <form id={field} className="community-form build-follow-up-form" onSubmit={event => { event.preventDefault(); void submit() }}>
      <label>Anything worth knowing? <span className="subtle">Optional</span>
        <textarea rows={3} maxLength={HARDWARE_NOTE_LIMIT} value={note} disabled={busy} onChange={event => setNote(event.target.value)} placeholder="A setting you like, what you used it on, how it sounds…" />
      </label>
      <p className="service-note">Posts publicly to the {module.name} discussion as “{hardwareReportBody(machine, os, module, build, '').replace(/\*\*/g, '')}”{note.trim() ? ', followed by your note.' : ''}</p>
      <div className="forum-actions"><button className="button button-primary" disabled={busy}>{busy ? 'Posting…' : 'Post to the discussion'}<Icon name="arrow" size={15} /></button><button type="button" className="text-button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
      {error && <p className="file-error" role="alert">{error}</p>}
    </form>}
  </li>
}
