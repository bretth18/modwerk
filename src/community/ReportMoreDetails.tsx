import type { ReactNode } from 'react'

/** Feedback reports already know the build; keep optional diagnostics out of the short initial form. */
export function ReportMoreDetails({ embedded, children }: { embedded: boolean; children: ReactNode }) {
  return embedded ? <details className="issue-report-more"><summary>More details <span>Optional</span></summary>{children}</details> : children
}
