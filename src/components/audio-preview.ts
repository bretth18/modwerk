import { moduleMediaDocument } from '../community/module-media'
import { assetUrl } from '../hosting'

export type AudioPreviewClip = {
  id: string
  url: string
  duration?: number
  peaks?: readonly number[]
  credit: string
  canRemove?: boolean
  caption?: string
  username?: string
}

/** Only declared recordings get a player; illustrations never imply a sound clip exists. */
export function moduleAudioPreviews(id: string): AudioPreviewClip[] {
  const document = moduleMediaDocument(id)
  return document?.media.filter(item => item.captureType === 'audio').map(item => ({
    id: item.path,
    url: assetUrl('module-media/' + id + '/' + document.version + '/' + item.path),
    credit: item.credit,
  })) ?? []
}

export function waveformPeaks(channels: readonly Float32Array[], count = 80): number[] {
  if (!channels.length || !channels[0].length || count < 1) return []
  const length = channels[0].length
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(index * length / count)
    const end = Math.min(length, Math.max(start + 1, Math.floor((index + 1) * length / count)))
    let peak = 0
    for (const channel of channels) {
      for (let sample = start; sample < end; sample++) peak = Math.max(peak, Math.abs(channel[sample] ?? 0))
    }
    return Math.min(1, peak)
  })
}
