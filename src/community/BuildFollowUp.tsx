import { useId, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { threadHref } from '../routing'
import { post } from './api'
import { hardwareReportBody, type BuiltModule } from './build-follow-up'
import { useCommunity } from './context'
import { moduleThreadId } from './modules'
import { updateHardwareFeedback } from './hardware-feedback'
import { ModuleIssueDialog } from './ModuleIssueDialog'
import { MODULE_STATISTICS_CHANGED } from './module-statistics'

const errorText = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.'

/** Shown once a build is downloaded: tell each module's thread how it runs on the unit.
 * The build panels sit behind the member gate, so only verified members see it. */
export function BuildFollowUp({ machine, os, modules, pendingIds, onPosted, embedded = false }: { machine: string; os: string; modules: readonly BuiltModule[]; pendingIds?: readonly string[]; onPosted?: (href: string) => void; embedded?: boolean }) {
  const { session } = useCommunity()
  const heading = useId()
  if (!modules.length || !session.user?.verified) return null
  return <section className={'build-follow-up' + (embedded ? '' : ' configuration-section')} aria-labelledby={embedded ? undefined : heading} aria-label={embedded ? 'Module hardware feedback' : undefined}>
    {!embedded && <div className="section-title"><h2 id={heading}>After you flash</h2></div>}
    <p className="service-note">{!embedded && <>Tried {modules.length > 1 ? 'these modules' : 'this module'} on your {machine}? </>}“Works” shares a public hardware report. A simple yes is enough.</p>
    <ul className="build-follow-up-list">{modules.filter(module => !pendingIds || pendingIds.includes(module.id)).map(module => <HardwareReport key={module.id} memberId={session.user!.id} machine={machine} os={os} module={module} build={modules} onPosted={onPosted} />)}</ul>
  </section>
}

/** One click posts a positive hardware report; a problem opens the module's form in place. */
function HardwareReport({ memberId, machine, os, module, build, onPosted }: { memberId: string; machine: string; os: string; module: BuiltModule; build: readonly BuiltModule[]; onPosted?: (href: string) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [posted, setPosted] = useState('')
  const submitting = useRef(false)
  const [reporting, setReporting] = useState(false)
  const thread = moduleThreadId(module.id)
  async function submit() {
    if (submitting.current || posted) return
    submitting.current = true
    setBusy(true); setError('')
    try {
      const result = await post<{ id: string; page: number }>('/forum/threads/' + thread + '/replies', { body: hardwareReportBody(machine, os, module, build) })
      const href = threadHref(thread, module.name + ' discussion', '?page=' + result.page + '&post=' + result.id)
      setPosted(href); onPosted?.(href)
      window.dispatchEvent(new Event(MODULE_STATISTICS_CHANGED))
      updateHardwareFeedback(memberId, { machine, os, modules: build }, { completed: module.id })
    } catch (error) { setError(errorText(error)) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <li className="build-follow-up-module">
    <div className="build-follow-up-row">
      <span className="build-follow-up-name"><strong>{module.name}</strong><span className="subtle">{module.version}</span></span>
      <div className="forum-actions">
        {posted ? <a className="text-button build-follow-up-posted" href={posted} aria-label={module.name + ': works report saved. View report'}><Icon name="check" size={15} />Works · reported</a>
          : <button type="button" className="button button-quiet" disabled={busy} aria-label={'Report ' + module.name + ' works on my ' + machine} onClick={() => void submit()}><Icon name="check" size={15} />{busy ? 'Saving…' : 'Works'}</button>}
        <button type="button" className="button button-quiet" aria-haspopup="dialog" aria-label={'Report a problem with ' + module.name} onClick={() => setReporting(true)}>Report a problem</button>
      </div>
    </div>
    {posted && <span className="sr-only" role="status">{module.name}: works report saved.</span>}
    {error && <p className="file-error" role="alert">{error}</p>}
    {reporting && <ModuleIssueDialog id={module.id} build={{ machine, os, modules: build }} onClose={() => setReporting(false)}/>}
  </li>
}
