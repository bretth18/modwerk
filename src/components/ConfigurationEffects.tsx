import metadata from '../engine/assets/chooser-metadata.json'
import { defaultChoosers } from '../engine/choosers'
import { DSP_LOADER } from '../engine/protocol'
import type { BuildView } from '../hooks/useFirmwareBuild'

const FX_NAMES: Record<string, string> = {
  FILTER: 'Filter', EQUALIZER: 'Equalizer', 'DJ EQ': 'DJ EQ', PHASER: 'Phaser',
  FLANGER: 'Flanger', CHORUS: 'Chorus', SPATIALIZER: 'Spatializer',
  'COMB FILTER': 'Comb Filter', COMPRESSOR: 'Compressor', 'LO-FI': 'Lo-Fi',
  DELAY: 'Delay', 'PLATE REV': 'Plate Reverb', 'SPRING REV': 'Spring Reverb', 'DARK REV': 'Dark Reverb',
}

export function ConfigurationEffects({ ids, keepStockFx2, build }: { ids: readonly string[]; keepStockFx2: boolean; build: BuildView }) {
  const blocked = build.state === 'error'
  const checked = !!build.report
  // The checked report also accounts for a compact FX2 menu when the longer list does not fit.
  const profile = !blocked && !checked && ids.length ? defaultChoosers(ids, DSP_LOADER ? keepStockFx2 : true) : null
  const omitted = build.report?.omittedStockFx2 ?? (profile ? metadata.stockFx2.filter(key => !profile.fx2.includes(key)) : [])

  return <section className="configuration-section stock-fx-summary" aria-labelledby="stock-fx-title">
    <div className="section-title"><h2 id="stock-fx-title">Stock FX replacements</h2>{!blocked && <span className="subtle">{checked ? 'Checked for this build' : 'Selection preview'}</span>}</div>
    <div aria-live="polite">
      {blocked ? <p>Resolve the configuration issues to see which stock FX will be replaced.</p> : <>
        {omitted.length ? <>
          <p>These stock effects will be unavailable in FX2:</p>
          <ul className="stock-fx-list">{omitted.map(key => <li key={key}>{FX_NAMES[key] ?? key}</li>)}</ul>
          <p>All original FX1 effects remain available.{omitted.length < metadata.stockFx2.length && ' Other original FX2 effects remain available.'}</p>
        </> : <p>No stock FX will be replaced. All original FX1 and FX2 effects remain available.</p>}
        {!checked && ids.length > 0 && <p className="subtle">The final FX menus are confirmed after your base firmware is checked.</p>}
      </>}
    </div>
    <p className="subtle">A DSP memory optimization is coming soon, allowing you to combine many more modules.</p>
  </section>
}
