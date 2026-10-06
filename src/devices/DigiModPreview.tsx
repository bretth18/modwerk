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
        {kind === 'mixing' && <g>
          <path className="signal-ghost" d="M28 97H294" strokeDasharray="3 5" />
          <path className="signal-main" d={Array.from({ length: 121 }, (_, i) => (i ? 'L' : 'M') + (28 + i * 2.2).toFixed(1) + ' ' + (97 - 30 * Math.exp(-(((i - 22) / 11) ** 2)) + 20 * Math.exp(-(((i - 64) / 13) ** 2)) - 24 * Math.exp(-(((i - 101) / 9) ** 2))).toFixed(1)).join(' ')} />
          {[22, 64, 101, 116].map(i => <path key={i} className="signal-ghost" d={'M' + (28 + i * 2.2).toFixed(1) + ' 40V154'} />)}
          <text x="25" y="177">4 BANDS · MASTER</text>
        </g>}
        {kind === 'modulation' && <g>
          <path className="signal-ghost" d={Array.from({ length: 121 }, (_, i) => (i ? 'L' : 'M') + (28 + i * 2.2).toFixed(1) + ' ' + (97 + Math.sin(i / 9) * 44).toFixed(1)).join(' ')} />
          <path className="signal-main" d={Array.from({ length: 121 }, (_, i) => (i ? 'L' : 'M') + (28 + i * 2.2).toFixed(1) + ' ' + (97 + Math.sin(i / 9) * 22 + Math.sin(i / 2.2) * 6).toFixed(1)).join(' ')} />
          <text x="25" y="177">LFO → PARAMETER</text>
        </g>}
        {kind === 'polyphony' && <g>
          {Array.from({ length: 8 }, (_, i) => [0, 1, 2].map(n => { const y = 140 - ((i * 5 + n * 4 + mod.id.length) % 9) * 9 - n * 24; return <path key={i + '-' + n} className={n ? 'signal-ghost' : 'signal-main'} d={'M' + (36 + i * 33) + ' ' + y + 'h22'} /> }))}
          <text x="25" y="177">CHORDS · VOICES</text>
        </g>}
        {kind === 'utility' && <g>
          <path className="signal-main" d={Array.from({ length: 61 }, (_, i) => (i ? 'L' : 'M') + (28 + i * 2.2).toFixed(1) + ' ' + (97 + Math.sin(i / 4) * 30 * Math.cos(i / 17)).toFixed(1)).join(' ')} />
          {Array.from({ length: 16 }, (_, i) => <path key={i} className="signal-ghost" d={'M' + (166 + i * 8) + ' 150V' + (150 - Math.abs(Math.sin(i * 1.3 + 0.4)) * 90 * Math.exp(-i / 12)).toFixed(1)} />)}
          <text x="25" y="177">SCOPE · SPECTRUM</text>
        </g>}
        {kind === 'framework' && <g>
          {[60, 130, 200, 270].map((x, i) => <g key={x}><path className="signal-main" d={'M' + (x - 14) + ' ' + (97 - 14) + 'h28v28h-28z'} />{i < 3 && <path className="signal-ghost" d={'M' + (x + 14) + ' 97H' + (x + 56)} />}</g>)}
          <text x="25" y="177">SRC PAGES · ICONS</text>
        </g>}
        {kind === 'sequencing' && <g>
          <path className="signal-ghost" d="M28 110H294" />
          {Array.from({ length: 16 }, (_, i) => { const step = [0, 7, 12, 7, 3, 10, 15, 10, 0, -5, 5, 12, 0, 7, 3, -2][i]; return <path key={i} className={i < 12 ? 'signal-main' : 'signal-ghost'} d={'M' + (36 + i * 16) + ' 110V' + (110 - step * 4)} /> })}
          <text x="25" y="177">16 STEPS · LOOP</text>
        </g>}
        {kind === 'performance' && <g>
          {[0.62, 0.38, 0.81, 0.27].map((level, i) => <g key={i}><path className="signal-ghost" d={'M' + (58 + i * 62) + ' 150V44'} /><path className="signal-main" d={'M' + (58 + i * 62) + ' 150V' + (150 - level * 106)} strokeWidth="9" /></g>)}
          <text x="25" y="177">CPU · DSP · RAM · DRIVE</text>
        </g>}
      </svg>
    </div>
  )
}
