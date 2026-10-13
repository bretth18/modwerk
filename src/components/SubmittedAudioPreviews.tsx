import { useState } from 'react'
import { AudioPlayer } from './AudioPlayer'
import { useModuleAudioPreviews } from './audio-preview-context'
export function SubmittedAudioPreviews({ id }: { id: string }) {
  const { clips, error, onRemove } = useModuleAudioPreviews(id)
  const [removing, setRemoving] = useState('')
  const [removeError, setRemoveError] = useState('')
  const submitted = clips.filter(clip => clip.id.startsWith('community/'))
  async function remove(clipId: string) {
    if (!onRemove || !window.confirm('Remove this audio preview?')) return
    setRemoving(clipId); setRemoveError('')
    try { await onRemove(clipId) }
    catch (failure) { setRemoveError(failure instanceof Error ? failure.message : 'This preview could not be removed.') }
    finally { setRemoving('') }
  }
  return <section className="submitted-audio-previews" aria-labelledby={'community-previews-' + id}>
    <h3 id={'community-previews-' + id}>Community previews</h3>
    {(error||removeError) && <p className="file-error" role="alert">{error||removeError}</p>}
    <div className="media-gallery">{submitted.map(clip => <figure key={clip.id}>
      <AudioPlayer src={clip.url} label={'audio preview by @' + clip.username}/>
      <figcaption><strong>@{clip.username}</strong>{clip.credit && <span>Recording by {clip.credit}</span>}{clip.caption && <p>{clip.caption}</p>}</figcaption>
      {clip.canRemove && onRemove && <button className="text-button" type="button" disabled={!!removing} onClick={() => void remove(clip.id)}>{removing === clip.id ? 'Removing…' : 'Remove preview'}</button>}
    </figure>)}</div>
    {!submitted.length && !error && <p className="service-note">No community previews yet. Share a recording with Add preview.</p>}
  </section>
}
