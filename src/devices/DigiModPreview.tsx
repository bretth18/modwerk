import { categorySlug, type DigiMod } from './digi-mods'

// Cover art drawn from the mod's kind, in the library's existing preview style.
export function DigiModPreview({ mod, compact = false }: { mod: DigiMod; compact?: boolean }) {
  const kind = categorySlug(mod.category)
  return (
    <div className={'module-preview ' + (compact ? 'compact-preview' : '')} data-module={'digi-' + kind} aria-hidden="true">
      <div className="preview-label"><span>{mod.title}</span><span className="preview-led" /></div>
      <svg viewBox="0 0 320 192" className="signal-art" fill="none">
        <g className="signal-grid">{[52, 97, 142].map(y => <path key={y} d={'M20 ' + y + 'H300'} />)}{[64, 128, 192, 256].map(x => <path key={x} d={'M' + x + ' 33V163'} />)}</g>
        {kind === 'sampling' && <g>
          {Array.from({ length: 64 }, (_, i) => { const h = (Math.abs(Math.sin(i * 1.7 + mod.id.length)) * 38 + 6) * Math.exp(-(i % 16) / 9); return <path key={i} className={i % 16 < 3 ? 'signal-main' : 'signal-secondary'} d={'M' + (30 + i * 4.1) + ' ' + (97 - h) + 'v' + h * 2} /> })}
          {[30, 95.6, 161.2, 226.8].map(x => <path key={x} className="signal-ghost" d={'M' + x + ' 40V154'} strokeDasharray="3 5" />)}
          <text x="25" y="177">SLICES</text>
        </g>}
        {kind === 'synthesis' && <g>
          <path className="signal-ghost" d={Array.from({ length: 121 }, (_, i) => (i ? 'L' : 'M') + (28 + i * 2.2).toFixed(1) + ' ' + (97 + Math.sin(i / 7) * 46).toFixed(1)).join(' ')} />
          <path className="signal-main" d={Array.from({ length: 121 }, (_, i) => (i ? 'L' : 'M') + (28 + i * 2.2).toFixed(1) + ' ' + (97 + Math.sin(i / 5 + Math.sin(i / 3) * 2.2) * 34 * Math.exp(-i / 90)).toFixed(1)).join(' ')} />
          <text x="25" y="177">OP A → OP B</text>
        </g>}
        {kind === 'performance' && <g>
          {[0.62, 0.38, 0.81, 0.27].map((level, i) => <g key={i}><path className="signal-ghost" d={'M' + (58 + i * 62) + ' 150V44'} /><path className="signal-main" d={'M' + (58 + i * 62) + ' 150V' + (150 - level * 106)} strokeWidth="9" /></g>)}
          <text x="25" y="177">CPU · DSP · RAM · DRIVE</text>
        </g>}
      </svg>
    </div>
  )
}
