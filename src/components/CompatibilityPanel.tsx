import { moduleHref } from '../routing'
import { checkSelection } from '../catalog/compatibility'
import { resolveSelection } from '../catalog/modules'
import type { ConflictFix } from '../catalog/selection-conflicts'
import { Icon } from './Icon'

export function CompatibilityPanel({ ids, keepStockFx2, buildState, onFix }: { ids: readonly string[]; keepStockFx2: boolean; buildState?: string; onFix: (fix: ConflictFix) => void }) {
  const result = checkSelection(ids, keepStockFx2)
  const fits = ['valid', 'building', 'built'].includes(buildState ?? '')
  const tone = result.conflicts.length ? 'conflict' : result.issues.length || buildState === 'error' ? 'pending' : 'clear'
  return <section className={'compatibility-panel compatibility-' + tone} aria-live="polite" aria-labelledby="compatibility-title">
    <div className="compatibility-heading"><span className="compatibility-icon"><Icon name={tone === 'conflict' ? 'sliders' : tone === 'clear' && ids.length ? 'check' : 'shield'} size={20} /></span><div><h2 id="compatibility-title">{!ids.length ? 'Choose your modules' : result.conflicts.length ? 'Some modules cannot run together' : result.issues.length ? 'Build verification pending' : buildState === 'error' ? 'Configuration needs attention' : fits ? 'Configuration fits' : 'No declared conflicts'}</h2><p>{result.conflicts.length ? 'Choose what to keep. Your configuration stays saved while you make changes.' : !ids.length ? 'Add a module from the library. Compatibility updates as you make changes.' : result.issues.length ? 'You can save this configuration while verification is pending.' : fits ? 'Selection and placement checks passed locally. This configuration has not been qualified on hardware.' : 'Module claims were checked. Choose your base firmware for placement checks.'}</p></div></div>
    {!!result.conflicts.length && <div className="compatibility-conflicts">{result.conflicts.map(conflict => <article className="conflict-card" key={conflict.id}><h3>{conflict.title}</h3><div className="conflict-modules">{resolveSelection(conflict.moduleIds).map(module => <a key={module.id} href={moduleHref(module.id)}>{module.name}</a>)}</div><p>{conflict.description}</p><div className="conflict-actions">{conflict.fixes.map(fix => <button className="button button-quiet" key={fix.label} onClick={() => onFix(fix)}>{fix.label}<Icon name="arrow" size={14} /></button>)}</div></article>)}</div>}
    {!!result.notes.length && <ul className="compatibility-notes">{result.notes.map(note => <li key={note}>{note}</li>)}</ul>}
  </section>
}
