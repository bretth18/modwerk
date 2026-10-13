import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { api } from '../community/api'
import { useCommunity } from '../community/context'
import { useLoginPrompt } from '../community/LoginPromptDialog'
import { communityModule, modulePageHref } from '../community/modules'
import { apiUrl } from '../hosting'
import { AudioPreviewContext } from './audio-preview-context'
import { moduleAudioPreviews, type AudioPreviewClip } from './audio-preview'
import { AudioPreviewSubmission } from './AudioPreviewSubmission'
import { getRoute } from '../routing'
import { AUDIO_PREVIEW_GUIDE_MODULE, AUDIO_PREVIEW_GUIDE_ROUTE } from './audio-preview-guide'

function subscribeRoute(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

type PublicPreview = { id: string; moduleId: string; credit: string; duration: number; canRemove: boolean; caption: string; username: string }
const clip = (item: PublicPreview): AudioPreviewClip => ({ id: 'community/' + item.id, url: apiUrl('/audio-previews/' + item.id), credit: item.credit, canRemove: item.canRemove, caption:item.caption, username:item.username })
export function PublicAudioPreviews({ children }: { children: ReactNode }) {
  const route = useSyncExternalStore(subscribeRoute, getRoute, () => '')
  const { session } = useCommunity()
  const [items, setItems] = useState<PublicPreview[]>([])
  const [adding, setAdding] = useState('')
  const [added, setAdded] = useState<Record<string,string>>({})
  const [error, setError] = useState('')
  const { dialog, gate } = useLoginPrompt('library')
  useEffect(() => {
    if (!session.available) return
    const controller = new AbortController()
    void api<{items:PublicPreview[]}>('/audio-previews',{signal:controller.signal}).then(data => {
      if (!controller.signal.aborted) { setItems(data.items); setError('') }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Audio previews could not be loaded.') })
    return () => controller.abort()
  }, [session.available, session.user?.id, session.admin])
  const clips: Record<string, AudioPreviewClip[]> = {}
  for (const item of items) (clips[item.moduleId] ??= moduleAudioPreviews(item.moduleId)).push(clip(item))
  async function submit(prepared: AudioPreviewClip, file: File) {
    const form = new FormData()
    form.set('id',prepared.id); form.set('file',file); form.set('credit',prepared.credit)
    form.set('caption',prepared.caption??'')
    form.set('duration',String(prepared.duration)); form.set('permission','true')
    const created = await api<PublicPreview>('/modules/' + adding + '/audio-previews',{method:'POST',body:form})
    setItems(current => [...current.filter(item => item.id !== created.id),created])
    setAdded(current => ({...current,[adding]:'community/' + created.id}))
    setError('')
  }
  async function remove(id: string) {
    await api('/audio-previews/' + id.replace('community/',''),{method:'DELETE'})
    setItems(current => current.filter(item => 'community/' + item.id !== id))
  }
  return <AudioPreviewContext.Provider value={{ clips, added, error, onRemove:remove, guideModule: route === AUDIO_PREVIEW_GUIDE_ROUTE ? AUDIO_PREVIEW_GUIDE_MODULE : undefined,
    onAdd:id => gate('Sign in to add an audio preview',() => setAdding(id),route === AUDIO_PREVIEW_GUIDE_ROUTE ? route : modulePageHref(id).slice(1))() }}>
    {children}
    {dialog}
    {adding && <AudioPreviewSubmission name={communityModule(adding)?.name??adding} persistent initialCredit={session.user?.displayName} onAdd={submit} onClose={() => setAdding('')}/>}
  </AudioPreviewContext.Provider>
}
