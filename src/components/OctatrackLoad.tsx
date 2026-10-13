import { useId, useState } from 'react'
import type { OctatrackLink } from '../engine/elekloader/octatrack-link'
import type { LoadReading } from '../engine/elekloader/upload-wire'
import { useOctatrackLoad } from '../hooks/useOctatrackLoad'
import { loadPath } from '../config/octatrack-load'
import './octatrack-load.css'

const percent = (value: number | null | undefined) => value == null ? '—' : `${(value / 10).toFixed(1)}%`
function Meter({ area, title, value, peak }: { area: string; title: string; value?: number | null; peak?: number | null }) {
  return <div className={'load-meter hub-cell ' + area}><span>{title}</span><strong>{percent(value)}</strong>{value == null ? <div className="load-meter-unavailable" aria-hidden="true" /> : <meter min={0} max={1000} value={value} aria-label={`${title} load`} aria-valuetext={percent(value)} />}<small>{peak != null ? `Recent device peak ${percent(peak)}` : ' '}</small></div>
}
const SERIES: { key: keyof Pick<LoadReading, 'cpu' | 'tracks1to4' | 'tracks5to8'>; title: string; className: string }[] = [
  { key: 'cpu', title: 'CPU', className: 'load-cpu' }, { key: 'tracks1to4', title: 'Tracks 1–4', className: 'load-core1' }, { key: 'tracks5to8', title: 'Tracks 5–8', className: 'load-core0' },
]

/** The Status panel's load: three meter cells (the hardware meter windows now) and a cell with the last five minutes,
 * as a graph or a table in the same space. Read only while Status shows. */
export function OctatrackLoad({ link, active }: { link: OctatrackLink | null; active: boolean }) {
  const { points, notice, clear, now, ready, visible, unsupported } = useOctatrackLoad(link, active), id = useId()
  const [table, setTable] = useState(false)
  const last = points.at(-1)
  const latest = active && ready && visible && last && now - last.at <= 6000 ? last.reading : null
  const observed = points.filter(point => point.reading)
  const off = !link?.getState().identity?.canSubmit || unsupported
  // The chart's takeaway: the highest reading still in the window, and where it was.
  let highest: { at: number; title: string; value: number } | undefined
  for (const point of observed) for (const item of SERIES) {
    const value = point.reading![item.key]
    if (value != null && now - point.at <= 300000 && (!highest || value > highest.value)) highest = { at: point.at, title: item.title, value }
  }
  return <>
    <Meter area="hub-cell-cpu" title="CPU" value={latest?.cpu} />
    <Meter area="hub-cell-dsp1" title="Tracks 1–4 · DSP" value={latest?.tracks1to4} peak={latest?.peak1to4} />
    <Meter area="hub-cell-dsp2" title="Tracks 5–8 · DSP" value={latest?.tracks5to8} peak={latest?.peak5to8} />
    <section className="octatrack-load hub-cell hub-cell-chart" aria-labelledby={`${id}-title`}>
      <div className="load-heading"><h3 id={`${id}-title`}>Last five minutes</h3>
        {highest && <span className="load-highest">Highest {percent(highest.value)} · {highest.title} · {new Date(highest.at).toLocaleTimeString()}</span>}
        <button type="button" className="text-button" disabled={!points.length} onClick={clear}>Clear</button>
        <button type="button" className="text-button" aria-pressed={table} disabled={off} onClick={() => setTable(value => !value)}>Table</button></div>
      {off ? <p className="hub-empty">{unsupported ? 'Live load needs a newer Modwerk base than the one on your Octatrack.' : 'Connect your Octatrack over USB to see its live load.'}</p> : <>
        <figure className="load-chart" hidden={table}>
          <div className="load-plot"><div className="load-y-labels" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div><svg viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label="CPU and DSP load over the last five minutes. Missing readings appear as gaps."><path className="load-grid" d="M0 0H600 M0 60H600 M0 120H600" />{SERIES.map(item => <path key={item.key} className={item.className} d={loadPath(points, item.key, now)} fill="none" />)}</svg></div>
          <figcaption className="load-legend">{SERIES.map(item => <span key={item.key} className={item.className}>{item.title}</span>)}<span className="load-time">5 min ago → now</span></figcaption>
        </figure>
        <div className="load-table" hidden={!table}><table><caption className="sr-only">Readings ({observed.length})</caption><thead><tr><th>Time</th><th>CPU</th><th>Tracks 1–4</th><th>Tracks 5–8</th></tr></thead><tbody>{points.map(point => <tr key={point.at}><td>{new Date(point.at).toLocaleTimeString()}</td><td>{percent(point.reading?.cpu)}</td><td>{percent(point.reading?.tracks1to4)}</td><td>{percent(point.reading?.tracks5to8)}</td></tr>)}</tbody></table></div>
        <p className="load-note" role="status">{notice || (latest ? 'Every two seconds while this page is open.' : 'Waiting for live load. Syncing takes priority.')}</p>
      </>}
    </section>
  </>
}
