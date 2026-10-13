import { STOCK_EFFECT_NAMES, STOCK_EFFECTS, STOCK_FX1 } from '../catalog/stock-effects'
import { StateChip } from './ModuleGrid'

/**
 * Which stock effects stay in the Octatrack's menus, as tiles like the modules': a click switches one
 * in or out. `unitRemoved` (what the unit has now) marks the tiles the next load changes.
 */
export function StockEffects({ removed, unitRemoved, onChange }: { removed: readonly string[]; unitRemoved?: readonly string[]; onChange: (removed: string[]) => void }) {
  const off = new Set(removed)
  return <section className="configuration-section stock-effects" aria-labelledby="stock-effects-title">
    <div className="section-title"><h2 id="stock-effects-title">Stock effects</h2><span className="module-grid-summary">{STOCK_EFFECTS.length - off.size} of {STOCK_EFFECTS.length} in the menus</span></div>
    <ul className="module-tiles stock-tiles">{STOCK_EFFECTS.map(key => { const on = !off.has(key), changed = !!unitRemoved && unitRemoved.includes(key) === on
      // Same marks as the modules': lit while it is in the unit's menus, outlined while only the set has it.
      const state = !unitRemoved ? on ? 'set' : 'off' : changed ? on ? 'load' : 'leaving' : on ? 'on' : 'off'
      return <li key={key} className={'module-tile stock-tile is-' + state}>
        <button type="button" className="module-tile-open" aria-pressed={on} onClick={() => onChange(on ? [...removed, key] : removed.filter(item => item !== key))}>
          <span className="stock-tile-art"><span>{key}</span></span><strong>{STOCK_EFFECT_NAMES[key] ?? key}</strong><small>{STOCK_FX1.includes(key) ? 'FX1 · FX2' : 'FX2'}</small>
        </button>
        <StateChip state={state}>{changed ? on ? 'Comes back' : 'Leaves the menus' : on ? 'In the menus' : 'Off'}</StateChip>
      </li> })}</ul>
  </section>
}
