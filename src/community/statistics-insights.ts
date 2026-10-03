import type { UsageDay, UsageStatistics } from './usage-contract'
import type { AdminModuleInsight } from './admin-insights-contract'

export const usageMetrics = [
  ['visitors', 'Daily visitors'], ['page_views', 'Page views'], ['configurations', 'Configurations started'],
  ['builds', 'Successful builds'], ['downloads', 'Firmware download requests'], ['exports', 'Configuration exports'],
] as const
export type UsageMetric = typeof usageMetrics[number][0]

export function dailyRows(data: UsageStatistics): { day: string; counts: UsageDay | null }[] {
  const byDay = new Map(data.rows.map(row => [row.day,row]))
  return Array.from({length:data.days},(_,index) => {
    const date = new Date(data.from+'T00:00:00Z')
    date.setUTCDate(date.getUTCDate()+index)
    const day = date.toISOString().slice(0,10)
    const counts = !data.collectionStarted || day < data.collectionStarted.slice(0,10) ? null
      : byDay.get(day)??{day,visitors:0,page_views:0,configurations:0,builds:0,downloads:0,exports:0}
    return {day,counts}
  })
}

export function usageInsights(data: UsageStatistics) {
  const rows = dailyRows(data)
  const collected = rows.flatMap(row => row.counts ? [row.counts] : [])
  const completed = collected.filter(row => row.day < data.to && row.day > (data.collectionStarted?.slice(0,10)??data.to))
  const totals = Object.fromEntries(usageMetrics.map(([key]) => [key,collected.reduce((sum,row) => sum+row[key],0)])) as Record<UsageMetric,number>
  const compare = (key: UsageMetric) => {
    if (!data.comparison || data.comparison.unavailableReason) return null
    const current = completed.reduce((sum,row) => sum+row[key],0)
    const previous = data.comparison.rows.reduce((sum,row) => sum+row[key],0)
    return {current,previous,percent:previous ? (current-previous)/previous*100 : null}
  }
  const peak = completed.reduce<UsageDay|null>((best,row) => !best || row.visitors>best.visitors ? row : best,null)
  return {rows,totals,compare,completedDays:completed.length,averageVisitors:completed.length ? completed.reduce((sum,row) => sum+row.visitors,0)/completed.length : null,
    activeDays:completed.filter(row => row.visitors>0).length,peak:peak?.visitors ? peak : null,today:collected.find(row => row.day===data.to)?.visitors??0}
}

export type ModuleInsightSort = 'downloads' | 'likes' | 'ratingAverage' | 'comments' | 'openIssues'
export function rankedModules(modules: readonly AdminModuleInsight[], sort: ModuleInsightSort, search: string) {
  const query = search.trim().toLowerCase()
  return modules.filter(module => (module.title+' '+module.moduleId).toLowerCase().includes(query))
    .sort((a,b) => (b[sort]??-1)-(a[sort]??-1) || (sort==='ratingAverage' ? b.ratings-a.ratings : 0) || a.title.localeCompare(b.title))
}

export function usageCsv(data: UsageStatistics) {
  return ['date_utc,coverage,'+usageMetrics.map(([key]) => key).join(','),...dailyRows(data).map(({day,counts}) => {
    const coverage = !counts ? 'uncollected' : day===data.to || day===data.collectionStarted?.slice(0,10) ? 'partial' : 'complete'
    return [day,coverage,...usageMetrics.map(([key]) => counts?.[key]??'')].join(',')
  })].join('\n')+'\n'
}
