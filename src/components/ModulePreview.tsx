import { DETAILS } from '../catalog/details.ts'

function sine(offset: number, amplitude = 30, frequency = 2.2) {
  return Array.from({ length: 121 }, (_, i) => {
    const x = 28 + i * 2.2
    const y = 97 + Math.sin(i / 120 * Math.PI * 2 * frequency + offset) * amplitude
    return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
  }).join(' ')
}

export function ModulePreview({ id, compact = false }: { id: string; compact?: boolean }) {
  return (
    <div className={'module-preview ' + (compact ? 'compact-preview' : '')} data-module={id} aria-hidden="true">
      <div className="preview-label"><span>{DETAILS[id].label}</span><span className="preview-led" /></div>
      <svg viewBox="0 0 320 192" className="signal-art" fill="none">
        <g className="signal-grid">{[52, 97, 142].map((y) => <path key={y} d={'M20 ' + y + 'H300'} />)}{[64, 128, 192, 256].map((x) => <path key={x} d={'M' + x + ' 33V163'} />)}</g>
        {id === 'sidechain-compressor' && <g><g fill="none" stroke="#b5a0ff" strokeLinecap="round" strokeLinejoin="round">
<path d="M27 61H42V40L48 61H85V40L91 61H128V40L134 61H157" strokeWidth="2.3"/>
<path d="M157 61H182V91" strokeWidth="1.7" opacity=".5"/>
<rect x="161" y="96" width="43" height="37" rx="5" strokeWidth="1.7" opacity=".6"/>
<path d="M28 125L34 104L40 144L46 104L52 144L58 104L64 144L70 104L76 144L82 104L88 144L94 104L100 144L106 104L112 144L118 104L124 144L130 104L136 144L142 104L148 144L154 125H161" opacity=".23" strokeWidth="1.7"/>
<path d="M205 125L211 116L217 134L223 110L229 140L235 105L241 145L247 104L253 145L259 116L265 133L271 112L277 138L283 107L289 143L295 125" strokeWidth="2.3"/>
<path d="M211 114C227 112 236 102 250 102M260 114C277 112 284 102 296 102" opacity=".4" strokeWidth="1.3"/>
<path d="M182 78L178 73M182 78L186 73" strokeWidth="1.7"/>
</g>
<g fill="#b5a0ff" fontFamily="monospace" fontSize="9" letterSpacing=".6"><text x="27" y="28" opacity=".7">T1 / KEY</text><text x="168" y="119">COMP</text><text x="25" y="177" opacity=".65">T5 / INPUT</text><text x="207" y="177" opacity=".65">DUCKED OUTPUT</text></g>
</g>}
        {id === 'spectrum' && <g>
          <path className="signal-ghost" d="M25 136C84 136 109 135 130 116S146 57 164 63 181 137 206 144 262 147 296 147" />
          <path className="signal-secondary" d="M25 116H117C147 116 160 39 177 43S189 120 209 132 263 138 296 138" />
          <path className="signal-main" d="M25 88H149C172 88 180 35 192 36S199 84 211 105 235 128 296 128" />
          <circle className="signal-dot" cx="192" cy="36" r="4" />
          <text x="25" y="177">20 Hz</text><text x="258" y="177">20 kHz</text>
        </g>}
        {id === 'modulation' && <g>
          <path className="signal-secondary" d={sine(1.4, 31)} /><path className="signal-main" d={sine(0, 31)} />
          <path className="signal-ghost" d={sine(0.7, 43)} />
          <text x="25" y="177">L</text><text x="280" y="177">R</text>
        </g>}
        {id === 'character' && <g>
          <path className="signal-ghost" d={sine(0, 49, 2.5)} />
          <path className="signal-main" d="M28 97 40 74 49 60 58 74 69 61 80 84 88 120 99 137 108 121 118 134 130 109 140 73 151 60 160 74 170 61 180 86 192 123 202 137 211 121 221 134 234 108 246 73 257 60 267 74 276 61 289 89" />
          <path className="signal-secondary" d="M25 60H295M25 137H295" strokeDasharray="3 6" />
          <text x="25" y="177">INPUT → FOLD → DRIVE</text>
        </g>}
        {id === 'miniverb' && <g>
          {Array.from({ length: 50 }, (_, i) => {
            const height = Math.exp(-i / 18) * (24 + Math.abs(Math.sin(i * 2.7)) * 42)
            return <path key={i} className={i < 7 ? 'signal-main' : 'signal-secondary'} d={'M' + (29 + i * 5.3) + ' ' + (97 - height) + 'v' + (height * 2)} />
          })}
          <path className="signal-ghost" d="M29 32C76 40 110 57 139 70S232 90 293 93" />
          <text x="25" y="177">EARLY REFLECTIONS → TAIL</text>
        </g>}
        {id === 'tapeecho' && <g>
          {[95, 225].map((x) => <g key={x}>
            <circle className="reel-outline" cx={x} cy="91" r="49" /><circle className="signal-secondary" cx={x} cy="91" r="35" />
            <circle className="signal-main" cx={x} cy="91" r="8" />
            {[0, 120, 240].map((angle) => <path key={angle} className="reel-spoke" d={'M' + (x - 10) + ' 70q10-11 20 0l-7 10h-6z'} transform={'rotate(' + angle + ' ' + x + ' 91)'} />)}
          </g>)}
          <path className="signal-main" d="M48 102 69 152H251L272 102M137 69h47" />
          <rect className="reel-head" x="143" y="141" width="34" height="21" rx="3" />
          <text x="25" y="180">WOW / FLUTTER / AGE</text>
        </g>}
        {id === 'euclid' && <g>
          {Array.from({ length: 16 }, (_, i) => {
            const active = [0, 3, 6, 9, 12].includes(i)
            const angle = i / 16 * Math.PI * 2 - Math.PI / 2
            return <circle key={i} cx={160 + Math.cos(angle) * 59} cy={94 + Math.sin(angle) * 59} r="5.3" className={active ? 'rhythm-on' : 'rhythm-off'} />
          })}
          <circle className="signal-ghost" cx="160" cy="94" r="40" />
          <text className="rhythm-count" x="160" y="99" textAnchor="middle">5 / 16</text>
          <text x="25" y="178">PULSES</text><text x="252" y="178">STEPS</text>
        </g>}
        {id === 'repitch' && <g>
          {Array.from({ length: 54 }, (_, i) => {
            const h = 8 + Math.abs(Math.sin(i * 1.7) * Math.sin(i * .26)) * 23
            return <path key={i} className="signal-secondary" d={'M' + (29 + i * 4.9) + ' ' + (67 - h) + 'v' + h * 2} />
          })}
          {Array.from({ length: 40 }, (_, i) => {
            const h = 5 + Math.abs(Math.sin(i * 1.7) * Math.sin(i * .26)) * 16
            return <path key={i} className="signal-main" d={'M' + (29 + i * 6.6) + ' ' + (127 - h) + 'v' + h * 2} />
          })}
          <text x="25" y="178">TEMPO ↓</text><text x="229" y="178">PITCH ↓</text>
        </g>}
        {id === 'analog-bassdrum' && <g>
          <path className="signal-ghost" d="M28 97H292" />
          <path className="signal-main" d={Array.from({length:121},(_,i)=>{
            const x=28+i*2.2, y=97+Math.sin(i*.48)*64*Math.exp(-i/30)
            return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)
          }).join(' ')} />
          <text x="25" y="177">808</text><text x="261" y="177">909</text>
        </g>}
        {id === 'midi-scenes' && <g>
          {[0,1,2,3,4].map(row=><g key={row}>
            <path className="signal-ghost" d={'M48 '+(47+row*22)+'H272'} />
            <circle className="signal-secondary" cx="48" cy={47+row*22} r="4" />
            <circle className="signal-secondary" cx="272" cy={47+row*22} r="4" />
            <path className="signal-main" d={'M48 '+(47+row*22)+'L272 '+(135-row*22)} />
          </g>)}
          <text x="25" y="177">SCENE A</text><text x="243" y="177">SCENE B</text>
        </g>}
        {id === 'usb-audio-out-tracks-main-cue' && <g>
          {Array.from({length:10},(_,i)=><g key={i}>
            <path className={i<8?'signal-secondary':'signal-main'} d={'M'+(42+i*25)+' 136V'+(54+Math.abs(Math.sin(i*1.3))*42)} />
            <circle className="signal-dot" cx={42+i*25} cy="142" r="3" />
          </g>)}
          <text x="25" y="177">TRACKS 1–8</text><text x="219" y="177">MAIN / CUE</text>
        </g>}
        {id === 'tapehead' && <g>
          <path className="signal-ghost" d={sine(0, 49, 2)} />
          <path className="signal-main" d={Array.from({ length: 121 }, (_, i) => {
            const v = Math.sin(i / 120 * Math.PI * 4) * 2
            const c = Math.max(-1, Math.min(1, v))
            return (i ? 'L' : 'M') + (28 + i * 2.2).toFixed(1) + ' ' + (97 + (1.5 * c - .5 * c ** 3) * 36).toFixed(1)
          }).join(' ')} />
          <path className="signal-secondary" d="M28 61H292M28 133H292" strokeDasharray="3 6" />
          <text x="25" y="177">DRIVE → SATURATION → TRIM</text>
        </g>}
        {id === 'quantizer'  && <g>
          <path className="signal-ghost" d="M28 139 291 43" />
          <path className="signal-main" d="M28 140H65V125H103V111H141V96H179V82H217V67H254V52H291" />
          {[28,65,103,141,179,217,254,291].map((x,i)=><circle key={x} className="signal-dot" cx={x} cy={140-i*14.6} r="3" />)}
          <text x="25" y="177">ROOT</text><text x="222" y="177">24 SCALES</text>
        </g>}
        {id === 'cc-map' && <g>
          {[0,1,2,3,4,5].map(i=><g key={i}>
            <circle className="signal-secondary" cx="48" cy={46+i*21} r="4" />
            <path className="signal-main" d={'M56 '+(46+i*21)+'H126L194 '+(46+i*21)+'H259'} />
            <circle className="reel-outline" cx="274" cy={46+i*21} r="8" />
            <path className="signal-secondary" d={'M274 '+(46+i*21)+'l4-4'} />
          </g>)}
          <text x="25" y="177">CC 68–73</text><text x="209" y="177">FX1 SETUP</text>
        </g>}
        {id === 'previewvol' && <g>
          <path className="signal-ghost" d={sine(0, 12, 3)} />
          <path className="signal-main" d={sine(0, 36, 3)} />
          <path className="signal-secondary" d="M29 52H291M29 142H291" strokeDasharray="3 6" />
          <text x="25" y="177">TRACK VOL ↓</text><text x="186" y="177">PREVIEW VOL 0</text>
        </g>}
      </svg>
      <div className="preview-controls">{DETAILS[id].controls.slice(0, 3).map((control) => <span key={control}>{control}</span>)}</div>
    </div>
  )
}
