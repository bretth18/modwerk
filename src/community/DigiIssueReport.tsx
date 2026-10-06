import { useEffect, useRef, useState } from 'react'
import { post } from './api'
import { useCommunity } from './context'
import { MemberPrompt } from './MemberPrompt'
import { FLASH_STATES, type DigiIssueContext, type FlashState } from './issue-context'
import { useWorkspaceReportContext } from './report-context'
import { communityModule } from './modules'
import { DEVICES_BY_ID } from '../devices/registry'
import { BugReportNotice, BugReportSuccess, ExistingIssues } from './BugReportNotice'
import { ReportNotifications } from './ReportNotifications'
import { useIssueTracker, type BugReportResult } from './issue-tracker'
import { useOpenIssueReport } from './useOpenIssueReport'
import { DiscussionIssueDraft } from './DiscussionIssueDraft'
import { useDiscussionIssueDraft } from './discussion-issue-draft'

export function DigiIssueReport({ id, openRequest = 0 }: { id: string; openRequest?: number }) {
  const module = communityModule(id)!, device = DEVICES_BY_ID[module.machine], workspace = useWorkspaceReportContext(module.machine), { session } = useCommunity()
  const report = useRef<HTMLDetailsElement>(null), title = useRef<HTMLInputElement>(null), success = useRef<HTMLDivElement>(null)
  const [sent, setSent] = useState<BugReportResult | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [opened, setOpened] = useState(false), tracker = useIssueTracker(id, opened)
  useOpenIssueReport(report, title, openRequest)
  const { draft, clearDraft } = useDiscussionIssueDraft(id)
  useEffect(() => { if (sent) { success.current?.focus(); report.current?.scrollIntoView({ block: 'start' }) } }, [sent])
  const inConfiguration = workspace.modules.some(item => item.id === module.moduleId)
  async function send(form: HTMLFormElement) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const fields = Object.fromEntries(new FormData(form)) as Record<string, string>
      if (fields.actual.length > 2000) throw new Error('Keep the actual result under 2,000 characters. Your complete discussion draft is available above for reference.')
      const context: DigiIssueContext = { machine: module.machine as DigiIssueContext['machine'], model: fields.model, flash: fields.flash as FlashState, os: fields.os, moduleVersion: fields.moduleVersion, modules: workspace.modules, keepStockFx2: null, build: workspace.build }
      setSent(await post<BugReportResult>('/modules/' + id + '/issues', { title: fields.title, steps: fields.steps, expected: fields.expected, actual: fields.actual, context, visibility: 'forum', notifyUpdates: fields.notifyUpdates === 'on' }))
      clearDraft()
      window.dispatchEvent(new Event('modwerk-module-updates'))
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to send the report.') } finally { setBusy(false) }
  }
  return <details ref={report} className="issue-report" onToggle={event => { if (event.currentTarget.open) setOpened(true) }}><summary>Report an issue <span>For @{module.author}</span></summary>
    {sent ? <div ref={success} className="issue-report-success" role="status" tabIndex={-1}><BugReportSuccess report={sent} /></div> : !session.user?.verified ? <MemberPrompt /> : <form className="community-form" aria-busy={busy} onSubmit={event => { event.preventDefault(); void send(event.currentTarget) }}>
      <BugReportNotice tracker={tracker} />
      <ExistingIssues id={id} tracker={tracker} />
      <fieldset><legend>1. Describe the problem</legend>
        {draft && <DiscussionIssueDraft body={draft.body} />}
        <label>Issue title<input ref={title} name="title" required maxLength={160} defaultValue={draft?.title ?? ''} placeholder="What went wrong, in one line" /></label>
        <div className="issue-report-row"><label>{device.name} model<select name="model" defaultValue="" required><option value="" disabled>Choose…</option>{(device.variants ?? [device.name]).map(model => <option key={model}>{model}</option>)}</select></label><label>It is running<select name="flash" defaultValue="" required><option value="" disabled>Choose…</option>{Object.entries(FLASH_STATES).map(([key, label]) => <option key={key} value={key}>{label.replace('an Octamod', 'a Modwerk')}</option>)}</select></label></div>
        <label>Steps to reproduce<textarea name="steps" required maxLength={3000} rows={4} placeholder={'1. Load a project with …\n2. Select …\n3. Turn …'} /></label>
        <label>Expected result<textarea name="expected" required maxLength={1000} rows={2} /></label>
        <label>Actual result<textarea name="actual" required maxLength={2000} rows={draft ? 4 : 2} defaultValue={draft?.body ?? ''} placeholder="What happened instead: sound, screen message, freeze, reboot …" />{draft && <span className="service-note">Copied from your discussion draft. Review and keep this under 2,000 characters.</span>}</label>
      </fieldset>
      <fieldset className="issue-report-attached"><legend>2. Check your configuration</legend>
        <div className="issue-report-row"><label>Base OS<select name="os" defaultValue="" required><option value="" disabled>Choose the OS you used…</option>{device.firmware?.releases.map(release => <option key={release}>{release}</option>)}</select></label><label>Module version<input name="moduleVersion" required maxLength={80} defaultValue={module.version} /></label></div>
        <p className="service-note">{workspace.modules.length ? <>Attached from this browser’s active configuration <strong>{workspace.configurationName}</strong>: {workspace.modules.map(item => item.id + ' ' + item.version).join(', ')}.</> : 'No modules are selected in your active configuration. If you have it saved here, select the configuration you flashed.'} {workspace.build ? 'Build fingerprint ' + workspace.build.slice(0, 12) + '….' : 'Not built in this browser session, so no build fingerprint.'}</p>
        {!!workspace.modules.length && !inConfiguration && <p className="file-error">This module is not in your active configuration. If you have it saved here, select the configuration you flashed before reporting.</p>}
      </fieldset>
      <p className="service-note">{device.name} reports use these details without an Octatrack log. The bug description will be public. Your full configuration and build fingerprint stay private to the people helping with your report. Do not include firmware, samples, passwords or personal information.</p>
      <ReportNotifications id={id} />
      <button className="button button-primary" disabled={busy}>{busy ? 'Posting…' : 'Post bug report'}</button>
    </form>}
    {error && <p className="file-error" role="alert">{error}</p>}
  </details>
}
