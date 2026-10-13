import { AudioPlayer } from './AudioPlayer'
import type { AudioPreviewClip } from './audio-preview'

export function AudioPreviewPlayer({ clip, name, prepare = true, variant = 'preview' }: { clip: AudioPreviewClip; name: string; prepare?: boolean; variant?: 'dock' | 'preview' }) {
  return <div className="audio-preview-player" title={clip.credit ? 'Recording by ' + clip.credit : undefined}>
    <AudioPlayer src={clip.url} label={'audio preview of ' + name} variant={variant} activation="manual" prepare={prepare}
      seekStartsPlayback peaks={clip.peaks} duration={clip.duration}/>
  </div>
}
