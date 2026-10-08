import { bayesianRating, ratingPrior } from './rating-ranking'

// openIssues, lastIssueAt and firstDownloadAt feed the stability grade; an older response without them grades as untried.
export type ModuleStatistics = { module_id: string; average: number | null; count: number; likes: number; downloads: number; downloadsStarted: string | null; worksReports?: number; firstDownloadAt?: string | null; openIssues?: number; lastIssueAt?: string | null }
export const MODULE_STATISTICS_CHANGED = 'modwerk-module-statistics'
export const DEFAULT_MODULE_SORT = 'updated'
// Every library sort, with the short label the phone results bar shows beside its sort icon.
export const MODULE_SORTS = [
  { value: 'updated', label: 'Recently updated', short: 'Updated' },
  { value: 'recent', label: 'Recently added', short: 'Newest' },
  { value: 'collection', label: 'Collection order', short: 'Collection' },
  { value: 'name', label: 'Name A–Z', short: 'A–Z' },
  { value: 'author', label: 'Author', short: 'Author' },
  { value: 'rated', label: 'Highest rated', short: 'Rating' },
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
  if (sort === 'rated') {
    const prior = ratingPrior(statistics ?? [])
    const aStats = statistics?.find(item => item.module_id === a.id), bStats = statistics?.find(item => item.module_id === b.id)
    return (bayesianRating(bStats, prior) ?? 0) - (bayesianRating(aStats, prior) ?? 0)
      || (bStats?.count ?? 0) - (aStats?.count ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  }
  const metric = sort === 'liked' ? 'likes' : sort === 'downloaded' ? 'downloads' : 'average'
  const difference = (statistics?.find(item => item.module_id === b.id)?.[metric] ?? 0) - (statistics?.find(item => item.module_id === a.id)?.[metric] ?? 0)
  return difference || a.name.localeCompare(b.name)
}
export function downloadCoverage(started: string | null | undefined) {
  return started ? 'Counts firmware download requests since ' + new Date(started).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}) + '. Each included module counts once per request.' : 'Counts firmware download requests since tracking began. Each included module counts once per request.'
}
