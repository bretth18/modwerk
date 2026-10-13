import { createContext, useContext } from 'react'
import { moduleAudioPreviews, type AudioPreviewClip } from './audio-preview'

export type AudioPreviewContextValue = {
  clips: Readonly<Record<string, readonly AudioPreviewClip[]>>
  onAdd: (id: string) => void
  onRemove?: (id: string) => Promise<void>
  added?: Readonly<Record<string,string>>
  error?: string
  guideModule?: string
}

// Public submissions supplement declared media; the prototype supplies disposable local clips.
export const AudioPreviewContext = createContext<AudioPreviewContextValue | null>(null)

export function useModuleAudioPreviews(id: string) {
  const context = useContext(AudioPreviewContext)
  return { clips: context?.clips[id] ?? moduleAudioPreviews(id), onAdd: context ? () => context.onAdd(id) : undefined,
    onRemove: context?.onRemove, added: context?.added?.[id]??'', error: context?.error, guide: context?.guideModule === id }
}
