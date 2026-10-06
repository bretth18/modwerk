import { useState } from 'react'
import { Icon } from '../components/Icon'
import { firstYouTubeVideo, type YouTubeVideo } from './forum-links'

/** A YouTube video that loads only once it is played, so reading a thread or chat sends nothing to YouTube. */
export function YouTubeEmbed({ video, label }: { video: YouTubeVideo; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const title = label || 'YouTube video'
  const watch = 'https://www.youtube.com/watch?v=' + video.id + (video.start ? '&t=' + video.start + 's' : '')
  // The nocookie host sets no cookie until played. The site sends no referrer, which YouTube's player rejects, so the frame asks for the origin only.
  const player = 'https://www.youtube-nocookie.com/embed/' + video.id + '?autoplay=1&rel=0&playsinline=1' + (video.start ? '&start=' + video.start : '')
  return <figure className="forum-video">
    {playing
      ? <iframe src={player} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox" />
      : <button type="button" className="forum-video-play" aria-label={'Play ' + title + ' from YouTube'} onClick={() => setPlaying(true)}><span className="forum-video-icon"><Icon name="play" size={22} /></span><strong>{label || 'Play video'}</strong><small>Loads from YouTube when played</small></button>}
    <figcaption><a href={watch} target="_blank" rel="noopener noreferrer nofollow">Watch on YouTube</a></figcaption>
  </figure>
}

/** The player for the first YouTube link in a plain-text message, shown under the text. */
export function TextVideo({ text }: { text: string }) {
  const video = firstYouTubeVideo(text)
  return video ? <YouTubeEmbed video={video} /> : null
}
