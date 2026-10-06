export const USAGE_EVENTS = ['page_view', 'configuration_started', 'build_succeeded', 'build_failed', 'firmware_download_requested', 'configuration_exported'] as const
export type UsageEvent = typeof USAGE_EVENTS[number]
/** Machines that build firmware here. Builds, failed builds and download requests may name one; nothing else does. */
export const USAGE_DEVICES = ['octatrack', 'digitakt', 'digitone'] as const
export type UsageDevice = typeof USAGE_DEVICES[number]
export const DEVICE_EVENTS: readonly UsageEvent[] = ['build_succeeded', 'build_failed', 'firmware_download_requested']
export type UsageDay = { day: string; visitors: number; page_views: number; configurations: number; builds: number; builds_failed: number; downloads: number; exports: number }
/** Period totals for one machine, from the day the breakdowns began. */
export type UsageDeviceTotals = { device: UsageDevice; builds: number; builds_failed: number; downloads: number }
export type UsageComparison = { from: string; to: string; rows: UsageDay[]; unavailableReason: 'collection' | 'retention' | null }
export type UsageStatistics = { generatedAt: string; collectionStarted: string | null; from: string; to: string; days: number; rows: UsageDay[]; comparison?: UsageComparison
  /** When failed builds and the machine split began to be counted; earlier days have neither. */
  breakdownsStarted?: string | null
  devices?: UsageDeviceTotals[] }
