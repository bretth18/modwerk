import { useEffect, useState } from 'react'
import { api } from './api'
import type { AdminAccounts } from './admin-insights-contract'

const format = (value: number) => value.toLocaleString()
const dateLabel = (day: string) => new Date(day + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const methodNames: Record<AdminAccounts['methods'][number]['method'], string> = { credential: 'Email and password', google: 'Google', github: 'GitHub', discord: 'Discord' }

/** Aggregate member counts and daily sign-ups; never lists individual members. */
export function AccountStatistics() {
  const [data, setData] = useState<AdminAccounts>(), [error, setError] = useState(''), [selectedDay, setSelectedDay] = useState('')
  useEffect(() => { let cancelled = false; void api<AdminAccounts>('/admin/accounts').then(value => { if (!cancelled) setData(value) }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Account statistics are unavailable.') }); return () => { cancelled = true } }, [])
  if (error) return <section className="configuration-section"><h2>Members</h2><p className="file-error" role="alert">{error}</p></section>
  if (!data) return <section className="configuration-section"><h2>Members</h2><p role="status">Loading account statistics…</p></section>
  const { totals, signups } = data, max = Math.max(1, ...data.daily.map(row => row.signups)), methodMax = Math.max(1, ...data.methods.map(row => row.members))
  const selected = data.daily.find(row => row.day === selectedDay) ?? data.daily[data.daily.length - 1]
  return <section className="configuration-section">
    <div className="section-title"><div><h2>Members</h2><p className="service-note">Current accounts · updated {new Date(data.generatedAt).toLocaleTimeString(undefined, { timeZone: 'UTC' })} UTC</p></div></div>
    <dl className="admin-overview statistics-workload">
      <div><dt>Members</dt><dd>{format(totals.members)}</dd><small>Verified, active accounts</small></div>
      <div><dt>New today</dt><dd>{format(signups.today)}</dd><small>{format(signups.last7)} in 7 days · {format(signups.last30)} in 30 days</small></div>
      <div><dt>Awaiting completion</dt><dd>{format(totals.unverified + totals.pendingSocial)}</dd><small>{format(totals.unverified)} unverified email · {format(totals.pendingSocial)} social sign-ups choosing a username</small></div>
      <div><dt>News opt-ins</dt><dd>{format(totals.newsOptIns)}</dd><small>{format(totals.administrators)} administrator{totals.administrators === 1 ? '' : 's'} · {format(totals.suspended)} suspended · {format(totals.deleted)} deleted</small></div>
    </dl>
    <figure className="visitors-chart">
      <div className="statistics-chart-heading"><figcaption>Daily sign-ups</figcaption></div>
      <p className="statistics-scale">New accounts per UTC day · scale 0–{format(max)}</p>
      <div className="visitors-bars" role="group" aria-label="Sign-ups by UTC day; use arrow keys to inspect days">
        {data.daily.map(({ day, signups: count }, index) => <button key={day} type="button" className={day === data.to ? 'is-today' : ''} title={dateLabel(day) + ': ' + format(count) + ' sign-up' + (count === 1 ? '' : 's')}
          aria-label={day + ': ' + format(count) + ' sign-ups' + (day === data.to ? ', partial day' : '')} aria-pressed={selected.day === day} tabIndex={selected.day === day ? 0 : -1}
          onClick={() => setSelectedDay(day)} onMouseEnter={() => setSelectedDay(day)}
          onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? Math.min(index + 1, data.daily.length - 1) : event.key === 'ArrowLeft' ? Math.max(index - 1, 0) : event.key === 'Home' ? 0 : event.key === 'End' ? data.daily.length - 1 : null
            if (next !== null) { event.preventDefault(); setSelectedDay(data.daily[next].day); (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus() }
          }}><span style={{ height: Math.max(2, count / max * 100) + '%' }}/></button>)}
      </div>
      <div className="chart-dates"><span>{dateLabel(data.from)}</span><span>{dateLabel(data.to)} · partial</span></div>
      <p className="statistics-selected" aria-live="polite">{dateLabel(selected.day)} · {format(selected.signups)} sign-up{selected.signups === 1 ? '' : 's'}{selected.day === data.to ? ' · partial day' : ''}</p>
    </figure>
    <div className="statistics-issue-ages"><h3>Sign-in methods</h3>{data.methods.map(row => <div key={row.method}><span>{methodNames[row.method]}</span><progress aria-label={methodNames[row.method] + ' members'} value={row.members} max={methodMax}/><strong>{format(row.members)}</strong></div>)}</div>
    <p className="service-note">Counts include only existing accounts; removed accounts no longer appear in the sign-up history. A member can use more than one method.</p>
  </section>
}
