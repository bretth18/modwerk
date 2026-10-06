import { deviceHref } from '../devices/registry'
import { moduleIssueHref } from './modules'

export function ModuleIssueNotice({ moduleId, machine, onReportIssue }: { moduleId?: string | null; machine?: string; onReportIssue?: () => void }) {
  return <aside className="forum-config module-issue-notice">
    <strong>Found a bug in a module?</strong>
    <p>Report bugs using “Report an issue” on the affected module’s page so its developers receive the reproduction steps, configuration and device details. Keep discussions for questions, tips, ideas and feedback.</p>
    {onReportIssue ? <button type="button" className="button button-danger" onClick={onReportIssue}>Report an issue</button> : moduleId ? <a className="button button-danger" href={moduleIssueHref(moduleId)}>Report an issue</a> : <a className="text-button" href={deviceHref(machine || 'all')}>Choose the affected module →</a>}
  </aside>
}
