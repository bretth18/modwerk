// Confirmation is distinct from open reports; an older response without triage must not imply no known bugs.
export type ModuleStatistics = { module_id: string; average: number | null; count: number; likes: number; downloads: number; downloadsStarted: string | null; worksReports?: number; firstDownloadAt?: string | null; openIssues?: number; lastIssueAt?: string | null; confirmedIssues?: number; unconfirmedIssues?: number; needsInfoIssues?: number; lastConfirmedIssueAt?: string | null }
export const MODULE_STATISTICS_CHANGED = 'modwerk-module-statistics'
export const DEFAULT_MODULE_SORT = 'updated'
// Every library sort, with the short label the phone results bar shows beside its sort icon.
export const MODULE_SORTS = [
  { value: 'updated', label: 'Recently updated', short: 'Updated' },
  { value: 'recent', label: 'Recently added', short: 'Newest' },
  { value: 'collection', label: 'Collection order', short: 'Collection' },
  { value: 'name', label: 'Name A–Z', short: 'A–Z' },
  { value: 'author', label: 'Author', short: 'Author' },
  { value: 'working', label: 'Most reported working', short: 'Working' },
  { value: 'liked', label: 'Most liked', short: 'Likes' },
  { value: 'downloaded', label: 'Most downloaded', short: 'Downloads' },
] as const
type SortableModule = { id: string; name: string; authorName: string; addedAt?: string; updatedAt?: string }
const timestamp = (date: string | undefined) => { const value = Date.parse(date ?? ''); return Number.isFinite(value) ? value : 0 }
export function compareModules(a: SortableModule, b: SortableModule, sort: string, statistics: readonly ModuleStatistics[] | null) {
  if (sort === 'collection') return 0
  if (sort === 'updated') {
    const updated = (module: SortableModule) => Math.max(timestamp(module.addedAt), timestamp(module.updatedAt))
    return updated(b) - updated(a) || a.name.localeCompare(b.name)
  }
  if (sort === 'recent') {
    return timestamp(b.addedAt) - timestamp(a.addedAt) || a.name.localeCompare(b.name)
  }
  if (sort === 'name') return a.name.localeCompare(b.name)
  if (sort === 'author') return a.authorName.localeCompare(b.authorName) || a.name.localeCompare(b.name)
  const count = (module: SortableModule, metric: 'worksReports' | 'likes' | 'downloads') => statistics?.find(item => item.module_id === module.id)?.[metric] ?? 0
  // Working reports lead, likes break their ties; the other two sorts fall back to the name.
  if (sort === 'working') return count(b, 'worksReports') - count(a, 'worksReports') || count(b, 'likes') - count(a, 'likes') || a.name.localeCompare(b.name)
  if (sort === 'liked') return count(b, 'likes') - count(a, 'likes') || a.name.localeCompare(b.name)
  if (sort === 'downloaded') return count(b, 'downloads') - count(a, 'downloads') || a.name.localeCompare(b.name)
  return 0
}
export function downloadCoverage(started: string | null | undefined) {
  return started ? 'Counts firmware download requests since ' + new Date(started).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}) + '. Each included module counts once per request.' : 'Counts firmware download requests since tracking began. Each included module counts once per request.'
}
