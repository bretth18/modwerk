import type { ModuleStatistics } from '../community/module-statistics'

// How far real use backs a module, shown at the foot of its library card. Every module starts at limited real-world
// testing and rises with downloads, time in use and time since a confirmed bug. Triage, questions and suggestions
// remain visible separately; they do not establish a defect or reset the quiet period.
export type StabilityLevel = 'pending' | 'reported' | 'limited' | 'in-use' | 'proven'
export type ModuleStability = { level: StabilityLevel; label: string; detail: string }

// Highest first. Days in use count from the first download; quiet days from the latest applicable confirmed bug.
export const STABILITY_GRADES = [
  { level: 'proven', label: 'Lots of use, no recent confirmed bugs', downloads: 500, days: 90, quietDays: 60 },
  { level: 'in-use', label: 'In regular use', downloads: 100, days: 30, quietDays: 30 },
] as const
const LIMITED = 'Limited real-world testing'
export const STABILITY_NOTE = 'The grade at the foot of each card rises with downloads and time without confirmed bugs; every module starts at ' + LIMITED.toLowerCase() + '. Confirmed bugs affecting the current version, or with unknown applicability, replace the grade. Unconfirmed reports are listed separately. Downloads and quiet time do not prove hardware reliability.'

const DAY = 86400000
const since = (value: string | null | undefined, now: number) => { const time = Date.parse(value ?? ''); return Number.isFinite(time) ? Math.max(0, (now - time) / DAY) : null }
const ago = (days: number) => days < 1 ? 'today' : Math.floor(days) === 1 ? '1 day ago' : Math.floor(days) + ' days ago'
const plural = (count: number, word: string) => count.toLocaleString() + ' ' + word + (count === 1 ? '' : 's')

export function moduleStability(statistics: ModuleStatistics | undefined, { buildPending = false, hardware = '' }: { buildPending?: boolean; hardware?: string } = {}, now = Date.now()): ModuleStability {
  const join = (...parts: string[]) => [...parts, hardware].filter(Boolean).join(' ')
  if (buildPending) return { level: 'pending', label: 'Build verification pending', detail: join('This module is not in downloadable builds yet.') }
  if (!statistics) return { level: 'limited', label: LIMITED, detail: join('Usage figures are unavailable right now, so this module is treated as untried.') }
  if (statistics.confirmedIssues === undefined) return { level: 'limited', label: LIMITED, detail: join('Report triage is unavailable right now. Read the reports on the module page; an open report is not automatically a confirmed bug.') }
  const open = statistics.confirmedIssues
  if (open) return { level: 'reported', label: plural(open, 'confirmed bug'), detail: join('A maintainer confirmed a bug affecting this version, or with unknown applicability. Read the reports on the module page before relying on it live.') }
  const inUse = since(statistics.firstDownloadAt, now) ?? 0, quiet = since(statistics.lastConfirmedIssueAt, now)
  const facts = plural(statistics.downloads, 'download') + (statistics.downloads ? ', the first ' + ago(inUse) : '') + '. ' + (quiet === null ? 'No applicable confirmed bugs recorded.' : 'Latest applicable confirmed bug ' + ago(quiet) + '.')
  const index = STABILITY_GRADES.findIndex(grade => statistics.downloads >= grade.downloads && inUse >= grade.days && (quiet === null || quiet >= grade.quietDays))
  const reached = STABILITY_GRADES[index], next = STABILITY_GRADES[(index < 0 ? STABILITY_GRADES.length : index) - 1]
  const step = next ? 'Moves to “' + next.label + '” after ' + next.downloads + ' downloads, ' + next.days + ' days in use and ' + next.quietDays + ' days without a newly confirmed bug.' : ''
  return { level: reached?.level ?? 'limited', label: reached?.label ?? LIMITED, detail: join(facts, step) }
}
