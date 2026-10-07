// openIssues, lastIssueAt and firstDownloadAt feed the stability grade; an older response without them grades as untried.
export type ModuleStatistics = { module_id: string; average: number | null; count: number; likes: number; downloads: number; downloadsStarted: string | null; firstDownloadAt?: string | null; openIssues?: number; lastIssueAt?: string | null }
type SortableModule = { id: string; name: string; authorName: string; addedAt?: string }
export function compareModules(a: SortableModule, b: SortableModule, sort: string, statistics: readonly ModuleStatistics[] | null) {
  if (sort === 'collection') return 0
  if (sort === 'recent') {
    const added = (module: SortableModule) => { const timestamp = Date.parse(module.addedAt ?? ''); return Number.isFinite(timestamp) ? timestamp : 0 }
    return added(b) - added(a) || a.name.localeCompare(b.name)
  }
  if (sort === 'name') return a.name.localeCompare(b.name)
  if (sort === 'author') return a.authorName.localeCompare(b.authorName) || a.name.localeCompare(b.name)
  const metric = sort === 'liked' ? 'likes' : sort === 'downloaded' ? 'downloads' : 'average'
  const difference = (statistics?.find(item => item.module_id === b.id)?.[metric] ?? 0) - (statistics?.find(item => item.module_id === a.id)?.[metric] ?? 0)
  return difference || a.name.localeCompare(b.name)
}
export function downloadCoverage(started: string | null | undefined) {
  return started ? 'Counts firmware download requests since ' + new Date(started).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}) + '. Each included module counts once per request.' : 'Counts firmware download requests since tracking began. Each included module counts once per request.'
}
