import { useEffect, useId, useState } from 'react'
import { BuildFollowUp } from './BuildFollowUp'
import { useCommunity } from './context'
import { dueHardwareFeedback, FEEDBACK_CHANGED, feedbackId, pendingFeedback, updateHardwareFeedback, type HardwareFeedback } from './hardware-feedback'
import { Icon } from '../components/Icon'

/** Recheck on a return to the page, rather than interrupting an active session with a timer or popup. */
export function HardwareFeedbackReminder() {
  const { session } = useCommunity(), memberId = session.user?.verified ? session.user.id : ''
  const [loaded, setLoaded] = useState<{ memberId: string; record?: HardwareFeedback } | null>(null)
  const [expanded, setExpanded] = useState(''), heading = useId(), details = useId()
  const [posted, setPosted] = useState<{ memberId: string; href: string } | null>(null)
  useEffect(() => {
    function refresh() { if (document.visibilityState !== 'hidden') setLoaded({ memberId, record: dueHardwareFeedback(memberId) }) }
    refresh()
    window.addEventListener(FEEDBACK_CHANGED, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('hashchange', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener(FEEDBACK_CHANGED, refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('hashchange', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [memberId])
  const record = memberId && loaded?.memberId === memberId ? loaded.record : undefined
  const confirmation = memberId && posted?.memberId === memberId ? <p className="success-note" role="status">Thanks for sharing your hardware experience. <a href={posted.href}>See your reply</a></p> : null
  if (!record) return confirmation
  const id = feedbackId(record), modules = pendingFeedback(record), open = expanded === id
  return <section className="configuration-section hardware-feedback-reminder" aria-labelledby={heading}>
    <div className="section-title"><h2 id={heading}>Tried your {record.machine} modules?</h2><button type="button" className="icon-button" aria-label="Dismiss feedback reminder for this build" onClick={() => updateHardwareFeedback(memberId, record, 'dismiss')}><Icon name="close" size={16}/></button></div>
    <p>You downloaded {modules.slice(0, 3).map(module => module.name).join(', ')}{modules.length > 3 ? ' and ' + (modules.length - 3) + ' more' : ''}. If you’ve tried it on your hardware, a quick note helps other people choosing modules.</p>
    <div className="forum-actions">
      <button type="button" className="button button-quiet" aria-expanded={open} aria-controls={details} onClick={() => setExpanded(open ? '' : id)}>{open ? 'Close feedback' : 'Share how it went'}</button>
      <button type="button" className="text-button" onClick={() => updateHardwareFeedback(memberId, record, 'later')}>Not yet — remind me tomorrow</button>
    </div>
    {confirmation}
    {open && <div id={details}><BuildFollowUp key={id} machine={record.machine} os={record.os} modules={record.modules} pendingIds={modules.map(module => module.id)} onPosted={href => setPosted({ memberId, href })} /></div>}
  </section>
}
