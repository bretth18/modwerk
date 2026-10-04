// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react'
import { DIGI_MODS, type DigiMod } from '../devices/digi-mods'
import { BUILDER_SOURCE, planBuild } from '../engine/elekloader/digi-build'
import { DIGI_DOWNLOADS_ENABLED } from '../engine/elekloader/protocol'
import { FIRMWARE_SHARING_NOTICE, FLASHING_RISKS } from '../firmware-notices'
import { assetUrl } from '../hosting'
import { useDigiBuild } from '../hooks/useDigiBuild'
import type { useDigiFirmware } from '../hooks/useDigiFirmware'
import { Icon } from './Icon'

function save(buffer: ArrayBuffer, name: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' })), link = document.createElement('a')
  link.href = url; link.download = name
  document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const kib = (bytes: number) => (bytes / 1024).toFixed(0) + ' KB'

export function DigiBuildPanel({ device, firmware, moduleIds }: { device: { id: DigiMod['device']; name: string; firmware?: { recovery: string } }; firmware: ReturnType<typeof useDigiFirmware>; moduleIds: readonly string[] }) {
  const ready = firmware.state === 'ready' && !!firmware.file, release = ready ? firmware.firmware?.release : undefined
  const plan = release ? planBuild(device.id, release, moduleIds) : undefined
  const missing = plan?.missing.map(id => DIGI_MODS.find(mod => mod.device === device.id && mod.id === id)?.title ?? id) ?? []
  const { state, check, build } = useDigiBuild(device.id, ready && !missing.length ? firmware.file : undefined, release, moduleIds)
  const [version, setVersion] = useState(''), [accepted, setAccepted] = useState(''), [downloaded, setDownloaded] = useState('')
  const deviceInfo = 'device' in state ? state.device : undefined, key = 'key' in state ? state.key : ''
  const result = state.phase === 'built' ? state.result : undefined
  const shown = version || deviceInfo?.default_version || '2.0a', length = deviceInfo?.version_len ?? 4
  const versionError = /^[\x20-\x7e]*$/.test(shown) && shown.length === length ? '' : 'Use exactly ' + length + ' plain characters.'
  const busy = state.phase === 'loading' || state.phase === 'checking' || state.phase === 'building'
  const message = !ready ? 'Add your original ' + device.name + ' OS file above. Builds run in this browser; nothing is uploaded.'
    : missing.length ? missing.join(', ') + (missing.length === 1 ? ' is' : ' are') + ' not available for OS ' + release + '. Remove ' + (missing.length === 1 ? 'it' : 'them') + ' or use another OS file.'
    : state.phase === 'idle' ? 'Check this selection with the builder. The first check loads the build engine (about 14 MB) once.'
    : state.phase === 'loading' ? 'Loading the build engine…'
    : state.phase === 'checking' ? 'Checking these mods together…'
    : state.phase === 'ready' ? (moduleIds.length ? 'Ready to build: the core and ' + moduleIds.length + (moduleIds.length === 1 ? ' mod fit' : ' mods fit') + ' together on OS ' + release + '.' : 'Ready to build the core alone on OS ' + release + '.')
    : state.phase === 'blocked' ? state.error
    : state.phase === 'building' ? state.log
    : state.phase === 'failed' ? state.error
    : state.phase !== 'built' ? ''
    : 'Firmware built and verified: ' + state.result.files[0].name + '.'
  return <>
    <section className="build-section" aria-labelledby="digi-build-title" aria-busy={busy}>
      <div><h2 id="digi-build-title">{result ? 'Firmware ready' : 'Build firmware'}</h2>
        <p id="digi-build-status" role={state.phase === 'blocked' || state.phase === 'failed' ? 'alert' : 'status'}>{message}</p>
        {state.phase === 'blocked' && state.check?.problems?.length ? <details className="build-report"><summary>Show the builder’s report</summary><ul className="build-problems">{state.check.problems.map(problem => <li key={problem}>{problem}</li>)}</ul></details> : null}
      </div>
      <div className="build-actions">
        {(state.phase === 'ready' || state.phase === 'failed' || state.phase === 'built') && <label className="version-field"><span>OS version shown on the unit</span>
          <input value={shown} maxLength={length} spellCheck={false} aria-invalid={!!versionError} aria-describedby="digi-version-help" onChange={event => setVersion(event.target.value)} />
          <small id="digi-version-help">{versionError || 'Shown instead of the stock version, so you can tell the builds apart.'}</small></label>}
        {state.phase === 'ready' || state.phase === 'failed' || state.phase === 'built'
          ? <button className={'button ' + (result ? 'button-quiet' : 'button-primary')} disabled={!!versionError} onClick={() => void build(shown)} aria-describedby="digi-build-status"><Icon name="sliders" size={16} />{result ? 'Build again' : 'Build firmware'}</button>
          : <button className="button button-primary" disabled={!ready || !!missing.length || busy} onClick={() => void check()} aria-describedby="digi-build-status"><Icon name="check" size={16} />{state.phase === 'blocked' ? 'Check again' : 'Check selection'}</button>}
        {result && DIGI_DOWNLOADS_ENABLED && <>
          <label className="risk-check"><input type="checkbox" checked={accepted === key} onChange={event => setAccepted(event.target.checked ? key : '')} /><span>I understand the risks of custom firmware and keep the original OS file to recover.</span></label>
          <button className="button button-primary" disabled={accepted !== key} onClick={() => { save(result.files[0].data, result.files[0].name); setDownloaded(key) }}><Icon name="download" size={16} />Download .syx</button>
        </>}
      </div>
    </section>
    <p className="file-footnote"><span>Builder: <a href={BUILDER_SOURCE.repository} target="_blank" rel="noreferrer">elekloader ↗</a> by irpina (GPL-2.0-or-later), with each mod’s pinned author release. It runs in this browser.</span></p>
    {result && <div className="build-facts"><span>Size <strong>{kib(result.bytes)}</strong></span><span>OS version <strong>{result.version}</strong></span><span>Built in <strong>{result.seconds.toFixed(1)} s</strong></span></div>}
    {result && !DIGI_DOWNLOADS_ENABLED && <aside className="risk-note" role="note"><strong>Downloads open after review</strong><p>The build ran and verified in this browser. Modwerk will offer {device.name} firmware files once their release is approved. Nothing was uploaded.</p></aside>}
    {result && DIGI_DOWNLOADS_ENABLED && <section className="configuration-section install-guide" aria-labelledby="digi-install-title"><div className="section-title"><h2 id="digi-install-title">Install on your {device.name}</h2><span className="pill">{result.version}</span></div>
      <ol><li>Connect the {device.name} over USB and open Elektron Transfer.</li><li>Select the unit, connect, and drop the .syx onto Transfer.</li><li>Press YES on the unit and keep it powered until the update finishes.</li></ol>
      <p className="service-note">To go back: {result.recovery || device.firmware?.recovery}</p>
      <p className="service-note">{FLASHING_RISKS} Flash at your own risk. Local checks cannot guarantee hardware safety.</p>
      <p className="service-note">{FIRMWARE_SHARING_NOTICE}</p>
      {downloaded === key && <p className="success-note" role="status">Download requested. Check your browser’s downloads folder.</p>}</section>}
    {result && <section className="configuration-section"><details><summary>File identity &amp; builder</summary><dl className="build-identity">
      <dt>SHA-256</dt><dd>{result.sha256}</dd><dt>Mods</dt><dd>{result.mods.join(', ')}</dd>
      <dt>Builder</dt><dd><a href={BUILDER_SOURCE.repository + '/tree/' + BUILDER_SOURCE.commit} target="_blank" rel="noreferrer">elekloader {BUILDER_SOURCE.commit.slice(0, 7)} ↗</a> by irpina, GPL-2.0-or-later · <a href={assetUrl('licenses/THIRD_PARTY_NOTICES.html')} target="_blank" rel="noreferrer">Licence notices</a></dd>
    </dl></details></section>}
  </>
}
