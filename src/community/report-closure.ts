// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
/** Closing a report without claiming a newly released firmware fix. */
export const REPORT_CLOSURE_REASONS = {
  configuration: 'Resolved by configuration or usage',
  duplicate: 'Duplicate report',
  not_reproducible: 'Could not reproduce',
  insufficient_information: 'Insufficient information',
  withdrawn: 'Report withdrawn or no longer applicable',
} as const
export type ReportClosureReason = keyof typeof REPORT_CLOSURE_REASONS
export function isReportClosureReason(value: unknown): value is ReportClosureReason {
  return typeof value === 'string' && Object.hasOwn(REPORT_CLOSURE_REASONS, value)
}

export const REPORT_KINDS = { bug: 'Bug report', question: 'Question', feature: 'Suggestion' } as const
export type ReportKind = keyof typeof REPORT_KINDS
export const REPORT_TRIAGE_STATES = {
  untriaged: 'Awaiting review',
  needs_info: 'Waiting for reporter',
  investigating: 'Investigating',
  confirmed: 'Confirmed bug',
  awaiting_verification: 'Fix awaiting verification',
} as const
export type ReportTriageState = keyof typeof REPORT_TRIAGE_STATES
/** Optional fields keep older API responses readable without assuming their reports are confirmed. */
export type ReportMetadata = {
  triage_state?: ReportTriageState; report_kind?: ReportKind; closure_reason?: ReportClosureReason | 'fixed' | null
  triage_note?: string; closure_note?: string; affected_version?: string | null; confirmed_at?: string | null
}
export function reportStatusLabel(report: ReportMetadata & { status: string }) {
  if (report.status === 'closed') return report.closure_reason === 'fixed' ? 'Fixed' : report.closure_reason ? REPORT_CLOSURE_REASONS[report.closure_reason] : 'Closed'
  return REPORT_TRIAGE_STATES[report.triage_state ?? 'untriaged']
}
export function isConfirmedBug(report: ReportMetadata) {
  return (report.report_kind ?? 'bug') === 'bug' && !!report.confirmed_at
}

/** The common actions appear in copied prompts, private report pages and new GitHub report descriptions. */
export const REPORT_COMMANDS = [
  '/modwerk needs-info <question>',
  '/modwerk confirm <affected-version|unknown> <reproduction evidence>',
  '/modwerk close insufficient_information <explanation>',
  '/modwerk close configuration|duplicate|not_reproducible|withdrawn <explanation>',
  '/modwerk reopen <explanation>',
  '/modwerk resolve <published-version> verified-download',
] as const
