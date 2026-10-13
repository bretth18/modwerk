import { useEffect, useRef, useState } from 'react'
import App from '../App'
import { CommunityContext, emptySession } from '../community/context'
import { MODULES } from '../catalog/modules'
import { AudioPreviewContext } from './audio-preview-context'
import { audioPreviewFixtures } from './audio-preview-fixtures'
import { AudioPreviewSubmission } from './AudioPreviewSubmission'
import { moduleAudioPreviews, type AudioPreviewClip } from './audio-preview'
import './audio-preview-prototype.css'

export default function AudioPreviewPrototype() {
  const [revision, setRevision] = useState(0)
  return <AudioPrototypeSession key={revision} onReset={() => setRevision(current => current + 1)}/>
}

function AudioPrototypeSession({ onReset }: { onReset: () => void }) {
  const [clips, setClips] = useState<Record<string, readonly AudioPreviewClip[]>>({})
  const [adding, setAdding] = useState('')
  const [notice, setNotice] = useState('')
  const urls = useRef(new Set<string>())
  useEffect(() => {
    let cancelled = false
    const owned = urls.current
    void Promise.resolve().then(() => {
      if (cancelled) return
      const fixtures = audioPreviewFixtures()
      for (const items of Object.values(fixtures)) for (const item of items) owned.add(item.url)
      setClips(fixtures)
    })
    return () => { cancelled = true; for (const url of owned) URL.revokeObjectURL(url) }
  }, [])

  function add(clip: AudioPreviewClip) {
    urls.current.add(clip.url)
    setClips(current => ({ ...current, [adding]: [...(current[adding] ?? moduleAudioPreviews(adding)), clip] }))
    setNotice('Preview added locally. Nothing was uploaded.')
  }
  const moduleName = MODULES.find(module => module.id === adding)?.name ?? adding
  return <CommunityContext.Provider value={{ session: emptySession, developer: null, catalog: [], refresh: async () => {}, refreshDeveloper: async () => {}, preview: true }}>
    <AudioPreviewContext.Provider value={{ clips, onAdd: setAdding }}>
      <div className="audio-prototype-root">
        <aside className="audio-prototype-toolbar" aria-label="Audio preview prototype">
          <div><strong>Audio preview prototype</strong><span>Synthetic clips · local submissions</span></div>
          <nav aria-label="Prototype views"><a href="#library">Library</a><a href="#module/tapeecho">Carousel</a><a href="#module/quantizer">Without audio</a><button type="button" onClick={onReset}>Reset</button></nav>
          {notice && <span className="audio-prototype-notice" role="status">{notice}</span>}
        </aside>
        <App/>
      </div>
      {adding && <AudioPreviewSubmission name={moduleName} onAdd={add} onClose={() => setAdding('')}/>}
    </AudioPreviewContext.Provider>
  </CommunityContext.Provider>
}
