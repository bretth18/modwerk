// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)

// Closed, versioned diagnostics: no arbitrary text, project data, USB serials, firmware or memory dumps.
export const OCTATRACK_DIAGNOSTICS_VERSION = '2026-10-12.2'
export const DIAGNOSTIC_RETENTION_DAYS = 30
export const DIAGNOSTIC_CONSENT_DAYS = 90
export const OCTATRACK_COUNTS = ['usb_sync_started', 'usb_sync_kept', 'usb_sync_undone', 'usb_sync_failed'] as const
export type OctatrackCount = typeof OCTATRACK_COUNTS[number]
export const DIAGNOSTIC_USB_EVENTS = ['connected', 'disconnected', 'sync_started', 'sync_failed', 'selftest', 'health', 'kept', 'undone'] as const
export const DIAGNOSTIC_USB_PHASES = ['unsupported', 'idle', 'connecting', 'stock', 'busy', 'ready', 'sending', 'testing', 'trial', 'finishing'] as const
export const DIAGNOSTIC_USB_ERRORS = ['device', 'selftest', 'transport', 'cancelled', 'stale', 'save', 'rollback', 'unknown'] as const
export const DIAGNOSTIC_BUILD_KINDS = ['octatrack-firmware', 'octatrack-base', 'elekloader'] as const
export const DIAGNOSTIC_BUILD_PHASES = ['preparing', 'composing', 'packing', 'verifying', 'building'] as const
export const DIAGNOSTIC_BUILD_ERRORS = ['input', 'selection', 'build', 'cancelled', 'unknown'] as const
export type DiagnosticBuildKind = typeof DIAGNOSTIC_BUILD_KINDS[number]
export type DiagnosticBuildPhase = typeof DIAGNOSTIC_BUILD_PHASES[number]
export type DiagnosticBuildError = typeof DIAGNOSTIC_BUILD_ERRORS[number]
/** Live site events carry only these fixed categories; the opted-in collector supplies an event id. */
export type SiteDiagnosticEvent =
  | { event: 'browser_error' | 'unhandled_rejection'; phase: 'browser' }
  | { event: 'build_failed'; phase: DiagnosticBuildPhase; buildKind: DiagnosticBuildKind; error: DiagnosticBuildError }
export const DIAGNOSTIC_EVENTS = [...DIAGNOSTIC_USB_EVENTS, 'browser_error', 'unhandled_rejection', 'build_failed'] as const
export const DIAGNOSTIC_PHASES = [...DIAGNOSTIC_USB_PHASES, 'browser', ...DIAGNOSTIC_BUILD_PHASES] as const
export const DIAGNOSTIC_ERRORS = [...DIAGNOSTIC_USB_ERRORS, 'input', 'selection', 'build'] as const
export const DIAGNOSTIC_RESULTS = ['ok', 'state', 'unsafe', 'identity', 'limit', 'stale', 'length', 'conflict', 'hash', 'rejected', 'backend', 'needs-recovery'] as const
export interface DiagnosticReading {
  state: number; failed: number; modules: number; dsp: number; intact: number; ran: number
  cpu: number; tracks1to4: number; tracks5to8: number; frameGap: number
  saved: number; savedCount: number; live: number; culprit: number; refusal: number
}
export interface OctatrackDiagnostic {
  id: string
  event: typeof DIAGNOSTIC_EVENTS[number]
  phase: typeof DIAGNOSTIC_PHASES[number]
  buildKind?: DiagnosticBuildKind
  base?: string
  active?: string
  error?: typeof DIAGNOSTIC_ERRORS[number]
  result?: typeof DIAGNOSTIC_RESULTS[number]
  refusal?: number
  reading?: DiagnosticReading
  /** Public catalogue versions; inventory names and project references never enter this list. */
  modules?: { id: string; catalogVersion: string }[]
  packages?: { sha256: string; bytes: number }[]
}
export interface DiagnosticConsent { accountId: string; enabled: boolean; version: string; changedAt: string | null; expiresAt: string | null }
export interface DiagnosticEntry { eventId: string; createdAt: string; data: OctatrackDiagnostic; username?: string }
