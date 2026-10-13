import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useCommunity } from './context'
import { readHardwareFeedback, updateHardwareFeedback } from './hardware-feedback'
import { useLoginPrompt } from './LoginPromptDialog'
import { MODULE_STATISTICS_CHANGED } from './module-statistics'
import { communityModule, modulePageHref } from './modules'
import { moduleWorksReport, saveWorkingReports } from './module-works-report'
import { useWorkingReportVersions } from './use-working-report-versions'

export function ModuleWorksReportButton({ id }: { id: string }) {
  const { session } = useCommunity()
  return <WorksReportAction key={id + ':' + communityModule(id)?.version + ':' + (session.user?.id ?? 'visitor')} id={id}/>
}

function WorksReportAction({ id }: { id: string }) {
  const { session, loading, preview } = useCommunity()
  const { dialog, gate } = useLoginPrompt(modulePageHref(id).slice(1))
  const [busy, setBusy] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState('')
  const version = communityModule(id)?.version, { versions, loading: checking } = useWorkingReportVersions(id)
  const posted = saved || !!version && versions.includes(version)
  const submitting = useRef(false)
  async function submit() {
    if (submitting.current || posted || !session.user?.verified) return
    submitting.current = true; setBusy(true); setError('')
    try {
      // An older download must never stand in for testing the updated module.
      const download = readHardwareFeedback(session.user.id).find(build => build.modules.some(module => module.id === id && module.version === version))
      const report = moduleWorksReport(id, download)
      if (!(import.meta.env.DEV && preview)) await saveWorkingReports(report.testedModuleIds, report.build, version)
      setSaved(true)
      if (!(import.meta.env.DEV && preview)) {
        window.dispatchEvent(new Event(MODULE_STATISTICS_CHANGED))
        if (download) updateHardwareFeedback(session.user.id, download, { completed: id })
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Your report could not be saved. Try again.') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <>
    <button type="button" className={'button module-works-action ' + (posted ? 'module-works-reported' : 'button-quiet')} disabled={loading || checking || busy || posted} title="Confirm this module works. Saved with available build details; no forum post." onClick={() => gate('Sign in to report this module working', () => void submit())()}><Icon name={posted ? 'check' : 'plus'} size={16}/>{busy ? 'Saving…' : posted ? 'Reported working' : checking ? 'Checking…' : 'Works for me'}</button>
    {dialog}
    {posted && <span className="sr-only" role="status">Working report saved.</span>}
    {error && <p className="file-error module-works-error" role="alert">{error}</p>}
  </>
}
