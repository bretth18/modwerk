import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import { accountInsights, accountMetrics } from './statistics-insights'
import type { AccountMetric } from './statistics-insights'
import type { AdminAccounts } from './admin-insights-contract'

const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 })
const rate = (value: number | null) => value === null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 1 : 0 }) + '%'
const dateLabel = (day: string) => new Date(day + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const methodNames: Record<AdminAccounts['methods'][number]['method'], string> = { credential: 'Email and password', google: 'Google', github: 'GitHub', discord: 'Discord' }
const plural = (count: number, word: string) => format(count) + ' ' + word + (count === 1 ? '' : 's')

function Change({ current, previous, percent }: { current: number; previous: number; percent: number | null }) {
  const change = current - previous
  return <small className="statistics-change">{percent === null
    ? change ? '+' + format(change) + ' · previous period: 0' : 'No change · both periods: 0'
    : change === 0 ? 'No change from previous period' : (change > 0 ? '+' : '') + format(percent) + '% from previous period'}</small>
}

/** Aggregate member counts, sign-up rate against site traffic and daily sign-ups; never lists individual members. */
export function AccountStatistics() {
  const [days, setDays] = useState(30), [metric, setMetric] = useState<AccountMetric>('signups')
  const [data, setData] = useState<AdminAccounts>(), [error, setError] = useState(''), [selectedDay, setSelectedDay] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void api<AdminAccounts>('/admin/accounts?days=' + days, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) { setData(value); setError('') } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Account statistics are unavailable.') })
    return () => controller.abort()
  }, [days])
  const periodControl = <div className="statistics-controls"><label>Member period<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></div>
  if (error) return <section className="configuration-section"><div className="section-title"><h2>Members</h2>{periodControl}</div><p className="file-error" role="alert">{error}</p></section>
  if (!data) return <section className="configuration-section"><div className="section-title"><h2>Members</h2>{periodControl}</div><p role="status">Loading account statistics…</p></section>
  return <AccountStatisticsReport data={data} loading={data.days !== days} metric={metric} onMetric={setMetric} selectedDay={selectedDay} onSelectDay={setSelectedDay} periodControl={periodControl}/>
}

type ReportProps = { data: AdminAccounts; loading: boolean; metric: AccountMetric; onMetric: (metric: AccountMetric) => void; selectedDay: string; onSelectDay: (day: string) => void; periodControl: ReactNode }
/** Pure rendering of one statistics response, kept separate so the markup can be tested without a backend. */
export function AccountStatisticsReport({ data, loading, metric, onMetric, selectedDay, onSelectDay, periodControl }: ReportProps) {
  const { totals, signups } = data, insights = accountInsights(data)
  const values = data.daily.map(row => insights.value(row, metric)), max = Math.max(1, ...values.map(value => value ?? 0)), methodMax = Math.max(1, ...data.methods.map(row => row.members))
  const label = accountMetrics.find(([key]) => key === metric)![1]
  const selected = data.daily.find(row => row.day === selectedDay) ?? data.daily[data.daily.length - 1]
  const describe = (index: number) => { const value = values[index], day = data.daily[index].day; return value === null ? 'visitors not collected' : (metric === 'rate' ? rate(value) : format(value)) + ' ' + label.toLowerCase() + (day === data.to ? ', partial day' : day === data.visitorsFrom ? ', partial collection day' : '') }
  const period = data.days - 1
  return <section className="configuration-section" aria-busy={loading}>
    <div className="section-title"><div><h2>Members</h2><p className="service-note">Current accounts · {dateLabel(data.from)} – {dateLabel(data.to)} UTC · updated {new Date(data.generatedAt).toLocaleTimeString(undefined, { timeZone: 'UTC' })} UTC</p></div>{periodControl}</div>
    {loading && <p role="status" className="service-note">Updating member statistics…</p>}
    <dl className="admin-overview statistics-workload">
      <div><dt>Members</dt><dd>{format(totals.members)}</dd><small>Verified, active accounts</small></div>
      <div><dt>New today</dt><dd>{format(signups.today)}</dd><small>{format(signups.last7)} in 7 days · {format(signups.last30)} in 30 days</small></div>
      <div><dt>Sign-ups, last {period} days</dt><dd>{format(insights.signups.current)}</dd><small>Completed days · today excluded</small><Change {...insights.signups}/></div>
      <div><dt>Sign-up rate</dt><dd>{rate(insights.rate.value)}</dd><small>{insights.rate.value === null ? 'Needs collected daily visitors' : 'Sign-ups per 100 daily visitors · ' + plural(insights.rate.coveredDays, 'covered day')}</small>
        <small className="statistics-change">{insights.rate.previous === null ? 'Previous period: traffic not fully collected' : 'Previous period: ' + rate(insights.rate.previous)}</small></div>
      <div><dt>Completed sign-ups</dt><dd>{rate(insights.completion.percent)}</dd><small>{insights.completion.signups ? format(insights.completion.completed) + ' of ' + plural(insights.completion.signups, 'sign-up') + ' verified and onboarded' : 'No sign-ups in this period'}</small>
        {insights.completion.previous !== null && <small className="statistics-change">Previous period: {rate(insights.completion.previous)}</small>}</div>
      <div><dt>Awaiting completion</dt><dd>{format(totals.unverified + totals.pendingSocial)}</dd><small>{format(totals.unverified)} unverified email · {format(totals.pendingSocial)} social sign-ups choosing a username</small></div>
      <div><dt>Active members</dt><dd>{format(totals.activeWeek)}</dd><small>Signed in within 7 days · {plural(totals.postersMonth, 'member')} posted in 30 days</small></div>
      <div><dt>News opt-ins</dt><dd>{format(totals.newsOptIns)}</dd><small>{plural(totals.administrators, 'administrator')} · {format(totals.suspended)} suspended · {format(totals.deleted)} deleted</small></div>
    </dl>
    <figure className="visitors-chart">
      <div className="statistics-chart-heading"><figcaption>Daily sign-ups</figcaption><label><span className="sr-only">Chart metric</span><select value={metric} onChange={event => onMetric(event.target.value as AccountMetric)}>{accountMetrics.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label></div>
      <p className="statistics-scale">{label} per UTC day · scale 0–{metric === 'rate' ? rate(max) : format(max)}</p>
      <div className="visitors-bars" role="group" aria-label={label + ' by UTC day; use arrow keys to inspect days'}>
        {data.daily.map(({ day }, index) => <button key={day} type="button" className={values[index] === null ? 'uncollected' : day === data.to ? 'is-today' : ''} title={dateLabel(day) + ': ' + describe(index)}
          aria-label={day + ': ' + describe(index)} aria-pressed={selected.day === day} tabIndex={selected.day === day ? 0 : -1}
          onClick={() => onSelectDay(day)} onMouseEnter={() => onSelectDay(day)}
          onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? Math.min(index + 1, data.daily.length - 1) : event.key === 'ArrowLeft' ? Math.max(index - 1, 0) : event.key === 'Home' ? 0 : event.key === 'End' ? data.daily.length - 1 : null
            if (next !== null) { event.preventDefault(); onSelectDay(data.daily[next].day); (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus() }
          }}><span style={{ height: values[index] === null ? '2%' : Math.max(2, values[index] / max * 100) + '%' }}/></button>)}
      </div>
      <div className="chart-dates"><span>{dateLabel(data.from)}</span><span>{dateLabel(data.to)} · partial</span></div>
      <p className="statistics-selected" aria-live="polite">{dateLabel(selected.day)} · {describe(data.daily.indexOf(selected))}{metric === 'rate' && selected.visitors ? ' · ' + plural(selected.signups, 'sign-up') + ' / ' + plural(selected.visitors, 'visitor') : ''}</p>
    </figure>
    <div className="statistics-issue-ages"><h3>Sign-in methods</h3>{data.methods.map(row => <div key={row.method}><span>{methodNames[row.method]}</span><progress aria-label={methodNames[row.method] + ' members'} value={row.members} max={methodMax}/><strong>{format(row.members)}</strong></div>)}</div>
    <details className="statistics-definitions"><summary>How member figures are counted</summary>
      <p>Counts include only existing accounts; removed accounts no longer appear in the sign-up history. A member can use more than one sign-in method. Period totals, rates and comparisons use completed UTC days: today is excluded, and the previous period is the equally long window just before ({dateLabel(data.previous.from)} – {dateLabel(data.previous.to)}).</p>
      <p>The sign-up rate divides sign-ups by the estimated daily visitors of the same days from the site statistics, so it needs the usage collection described there and skips days before {data.visitorsFrom ? 'collection began on ' + dateLabel(data.visitorsFrom) + ' UTC' : 'collection begins'}. Daily visitors are rotating identifiers, so the rate approximates sign-ups per 100 visits, not per 100 people, and visitors who object to counting or send Do Not Track are missing from the denominator.</p>
      <p>A sign-up is completed once the email address is verified and any social onboarding has finished; recent days are naturally lower while verification is pending. Active members have used a sign-in session within the last 7 days. Posting members wrote at least one visible forum post in the last 30 days.</p>
    </details>
  </section>
}
