import { useState } from 'react'
import { REPORT_KINDS, REPORT_TRIAGE_STATES, type ReportMetadata } from './report-closure'

export function ReportTriageForm({ report, busy, publicReport, onChange }: { report: ReportMetadata; busy: boolean; publicReport: boolean; onChange: (body: Record<string, unknown>) => void }) {
  const [action,setAction] = useState('needs_info'),[note,setNote] = useState(''),[version,setVersion] = useState(report.affected_version ?? 'unknown')
  const classification = action.startsWith('kind:')
  return <details className="github-issue-conversation"><summary>Update report status</summary>
    <p className="service-note">Request information, investigate a report or confirm a bug. {publicReport ? 'Your explanation is public with this report; keep private details and logs out of it.' : 'Your explanation stays within this report’s sharing permissions.'} The reporter is notified.</p>
    <form className="community-form" onSubmit={event => { event.preventDefault(); onChange(classification ? {reportKind:action.slice(5),note} : {triageState:action,note,...(action === 'confirmed' ? {affectedVersion:version} : {})}) }}>
      <label>Action<select value={action} disabled={busy} onChange={event => setAction(event.target.value)}>
        {Object.entries(REPORT_TRIAGE_STATES).map(([value,label]) => <option key={value} value={value} disabled={value === 'awaiting_verification' && !report.confirmed_at}>{value === 'untriaged' ? 'Return to review / remove confirmation' : label}</option>)}
        {Object.entries(REPORT_KINDS).map(([value,label]) => <option key={value} value={'kind:'+value}>Classify as {label.toLowerCase()}</option>)}
      </select></label>
      {action === 'confirmed' && <label>Affected version<input value={version} disabled={busy} onChange={event => setVersion(event.target.value)} required maxLength={100}/><small>Exact module version, or “unknown”. Configuration reports use “unknown”.</small></label>}
      <label>{publicReport ? 'Public explanation or question' : 'Explanation or question'}<textarea value={note} disabled={busy} onChange={event => setNote(event.target.value)} required maxLength={2000} rows={3}/></label>
      <button className="button button-quiet" disabled={busy || !note.trim()}>{busy ? 'Updating report…' : 'Update report and notify reporter'}</button>
    </form>
  </details>
}
