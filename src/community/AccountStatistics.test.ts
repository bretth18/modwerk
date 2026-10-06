import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountStatisticsReport } from './AccountStatistics'
import type { AdminAccounts } from './admin-insights-contract'

const day = (day: string, signups: number, completed: number, visitors: number | null) => ({ day, signups, completed, visitors })
const data: AdminAccounts = { generatedAt: '2026-10-06T12:00:00Z', from: '2026-09-30', to: '2026-10-06', days: 7, visitorsFrom: '2026-10-01',
  totals: { members: 12, unverified: 1, pendingSocial: 0, suspended: 0, deleted: 0, administrators: 1, newsOptIns: 4, activeWeek: 5, postersMonth: 3 },
  signups: { today: 2, last7: 9, last30: 20 }, methods: [{ method: 'credential', members: 8 }, { method: 'google', members: 3 }, { method: 'github', members: 2 }, { method: 'discord', members: 0 }],
  daily: [day('2026-09-30', 1, 1, null), day('2026-10-01', 2, 2, 10), day('2026-10-02', 1, 1, 100), day('2026-10-03', 0, 0, 50), day('2026-10-04', 3, 1, 50), day('2026-10-05', 0, 0, 0), day('2026-10-06', 2, 0, 30)],
  previous: { from: '2026-09-24', to: '2026-09-29', signups: 4, completed: 4, visitors: 400 } }
const render = (value: AdminAccounts, metric: 'signups' | 'completed' | 'rate' = 'signups') => renderToStaticMarkup(createElement(AccountStatisticsReport, { data: value, loading: false, metric, onMetric: () => {}, selectedDay: '', onSelectDay: () => {}, periodControl: null }))

describe('member statistics report', () => {
  it('shows sign-up rate, completion and activity figures from completed days', () => {
    const html = render(data)
    expect(html).toContain('Sign-ups, last 6 days')
    expect(html).toContain('+75% from previous period')
    expect(html).toContain('Sign-ups per 100 daily visitors · 4 covered days')
    expect(html).toContain('<dd>2%</dd>')
    expect(html).toContain('Previous period: 1%')
    expect(html).toContain('5 of 7 sign-ups verified and onboarded')
    expect(html).toContain('Signed in within 7 days · 3 members posted in 30 days')
    expect(html).toContain('collection began on')
    expect(html).not.toMatch(/NaN|undefined|Infinity/)
  })
  it('marks days without collected visitors on the rate chart and never invents a rate', () => {
    const html = render({ ...data, visitorsFrom: null, daily: data.daily.map(row => ({ ...row, visitors: null })), previous: { ...data.previous, visitors: null, signups: 0, completed: 0 } }, 'rate')
    expect(html).toContain('<dd>—</dd>')
    expect(html).toContain('Needs collected daily visitors')
    expect(html).toContain('Previous period: traffic not fully collected')
    expect(html).toContain('+7 · previous period: 0')
    expect((html.match(/class="uncollected"/g) ?? []).length).toBe(7)
    expect(html).not.toMatch(/NaN|undefined|Infinity/)
  })
})
