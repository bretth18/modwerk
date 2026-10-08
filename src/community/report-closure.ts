/** Closing a report without claiming a newly released firmware fix. */
export const REPORT_CLOSURE_REASONS = {
  configuration: 'Resolved by configuration or usage',
  duplicate: 'Duplicate report',
  not_reproducible: 'Could not reproduce',
  withdrawn: 'Report withdrawn or no longer applicable',
} as const
export type ReportClosureReason = keyof typeof REPORT_CLOSURE_REASONS
export function isReportClosureReason(value: unknown): value is ReportClosureReason {
  return typeof value === 'string' && Object.hasOwn(REPORT_CLOSURE_REASONS, value)
}
