import type { UsageStatistics } from './usage-contract'

export function pageTraffic(data: UsageStatistics, page = '') {
  const rows = (data.pages ?? []).filter(row => row.day >= data.from && row.day <= data.to)
  const totals = new Map<string, number>(), daily = new Map<string, number>()
  for (const row of rows) {
    totals.set(row.page, (totals.get(row.page) ?? 0) + row.views)
    if (!page || row.page === page) daily.set(row.day, (daily.get(row.day) ?? 0) + row.views)
  }
  const ranked = [...totals].map(([page, views]) => ({ page, views })).sort((a, b) => b.views - a.views || a.page.localeCompare(b.page))
  const total = ranked.reduce((sum, row) => sum + row.views, 0), started = data.pagesStarted?.slice(0, 10)
  const days = Array.from({ length: data.days }, (_, index) => {
    const day = new Date(Date.parse(data.from + 'T00:00:00Z') + index * 86400000).toISOString().slice(0, 10)
    return { day, views: started && day >= started ? daily.get(day) ?? 0 : null, partial: day === started || day === data.to }
  })
  return { ranked, total, days, unattributed: Math.max(0, data.rows.reduce((sum, row) => sum + row.page_views, 0) - total) }
}
