import { useState } from 'react'
import { REPORT_CLOSURE_REASONS, type ReportClosureReason } from './report-closure'

export function CloseReportForm({ busy, onClose }: { busy: boolean; onClose: (reason: ReportClosureReason, note: string) => void }) {
  const [reason, setReason] = useState<ReportClosureReason>('configuration'), [note, setNote] = useState('')
  return <details className="github-issue-conversation"><summary>Close without a new release</summary>
    <p className="service-note">For configuration mistakes, duplicates or reports you cannot reproduce. Your explanation is posted publicly on GitHub and the reporter is notified. Keep private configuration details and logs out of it. A firmware fix uses the verified release action above.</p>
    <form className="community-form" onSubmit={event => { event.preventDefault(); onClose(reason, note) }}>
      <label>Closure reason<select value={reason} disabled={busy} onChange={event => setReason(event.target.value as ReportClosureReason)}>{Object.entries(REPORT_CLOSURE_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Public explanation<textarea value={note} disabled={busy} onChange={event => setNote(event.target.value)} required maxLength={2000} rows={3}/></label>
      <button className="button button-quiet" disabled={busy || !note.trim()}>{busy ? 'Closing report…' : 'Close report and notify reporter'}</button>
    </form>
  </details>
}
