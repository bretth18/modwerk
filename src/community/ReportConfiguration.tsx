import type { WorkspaceReportContext } from './report-context'

/** One line about the configuration that goes with a report, plus a warning when the module is missing from it. */
export function ReportConfiguration({ workspace, inConfiguration, os }: { workspace: WorkspaceReportContext; inConfiguration: boolean; os?: string }) {
  if (!workspace.modules.length) return <p className="service-note">No active configuration in this browser. If you saved the one you flashed here, select it first.</p>
  return <>
    <p className="service-note">Attached privately: configuration <strong>{workspace.configurationName}</strong>{os ? ', base OS ' + os : ''}, {workspace.modules.length} {workspace.modules.length === 1 ? 'module' : 'modules'}{workspace.build ? ', build fingerprint' : ''}.</p>
    {!inConfiguration && <p className="file-error">This module is not in your active configuration. If you have it saved here, select the configuration you flashed before reporting.</p>}
  </>
}
