import { Icon } from '../components/Icon'

export const WORKS_REPORT_NOTE = 'Distinct members with a public “Works on my…” report, across module versions. Community reports are not hardware qualification.'

export function ModuleWorksCount({ count, compact = false }: { count?: number | null; compact?: boolean }) {
  const label = count == null ? 'Working report count unavailable' : count + (count === 1 ? ' member reports' : ' members report') + ' this module working, across versions'
  return <span className="module-works-count" title={WORKS_REPORT_NOTE} aria-label={label}><Icon name="check" size={13}/>{count == null ? '—' : count.toLocaleString()}{!compact && ' report' + (count === 1 ? '' : 's') + ' working'}</span>
}
