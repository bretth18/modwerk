import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ForumPostBody } from './ForumPostBody'
import { TextVideo } from './YouTubeEmbed'
import { firstYouTubeVideo, youTubeVideo } from './forum-links'

const ID = 'dQw4w9WgXcQ'
const render = (body: string) => renderToStaticMarkup(createElement(ForumPostBody, { body }))

describe('YouTube links', () => {
  it('finds the video behind watch, share, Shorts, live and embed links, with the start time', () => {
    for (const url of [`https://www.youtube.com/watch?v=${ID}`, `https://youtube.com/watch?v=${ID}&feature=share`, `https://m.youtube.com/watch?v=${ID}`, `https://music.youtube.com/watch?v=${ID}`, `https://youtu.be/${ID}`, `https://www.youtube.com/shorts/${ID}`, `https://www.youtube.com/live/${ID}?si=abc`, `https://www.youtube.com/embed/${ID}`, `http://youtu.be/${ID}`, `  https://youtu.be/${ID}  `])
      expect(youTubeVideo(url), url).toEqual({ id: ID, start: 0 })
    expect(youTubeVideo(`https://youtu.be/${ID}?t=90`)?.start).toBe(90)
    expect(youTubeVideo(`https://youtu.be/${ID}?t=1m30s`)?.start).toBe(90)
    expect(youTubeVideo(`https://youtu.be/${ID}?t=1h2m3s`)?.start).toBe(3723)
    expect(youTubeVideo(`https://www.youtube.com/watch?v=${ID}&start=45`)?.start).toBe(45)
    expect(youTubeVideo(`https://youtu.be/${ID}?t=2m`)?.start).toBe(120)
    for (const bad of ['abc', '-5', '99999999', '1x', '1s2m']) expect(youTubeVideo(`https://youtu.be/${ID}?t=${bad}`)?.start, bad).toBe(0)
  })

  it('leaves playlists, channels, look-alike hosts and malformed links alone', () => {
    for (const url of ['https://www.youtube.com/playlist?list=PL12345678901', 'https://www.youtube.com/@channel', 'https://www.youtube.com/watch', 'https://www.youtube.com/watch?v=short', `https://www.youtube.com/watch?v=${ID}x`, `https://youtube.com.evil.example/watch?v=${ID}`, `https://evil.example/watch?v=${ID}`, `https://notyoutu.be/${ID}`, `https://user:pass@www.youtube.com/watch?v=${ID}`, `https://www.youtube.com:8443/watch?v=${ID}`, `javascript:alert(1)//youtube.com/watch?v=${ID}`, `ftp://youtu.be/${ID}`, `https://youtu.be/${ID} extra`, ''])
      expect(youTubeVideo(url), url).toBeUndefined()
  })

  it('takes the first video from plain text and ignores the punctuation after it', () => {
    expect(firstYouTubeVideo(`Check this out: https://youtu.be/${ID}.`)).toEqual({ id: ID, start: 0 })
    expect(firstYouTubeVideo(`(see https://www.youtube.com/watch?v=${ID}&t=5s)`)).toEqual({ id: ID, start: 5 })
    expect(firstYouTubeVideo(`Docs https://example.test/a then https://youtu.be/${ID}`)?.id).toBe(ID)
    expect(firstYouTubeVideo('No video here https://example.test/watch?v=dQw4w9WgXcQ')).toBeUndefined()
    expect(firstYouTubeVideo('')).toBeUndefined()
  })
})

describe('YouTube videos in posts', () => {
  it('turns a link on its own line into the normal YouTube player, framed from the privacy-enhanced host only', () => {
    for (const body of [`https://youtu.be/${ID}`, `<https://www.youtube.com/watch?v=${ID}>`, `Listen to this:\n\nhttps://www.youtube.com/watch?v=${ID}&t=30\n\nWhat do you think?`]) {
      const html = render(body)
      expect(html, body).toContain('class="forum-video"')
      expect(html).toContain(`src="https://www.youtube-nocookie.com/embed/${ID}?rel=0&amp;playsinline=1`)
      expect(html).toContain('loading="lazy"')
      expect(html).toMatch(/referrerpolicy="strict-origin-when-cross-origin"/i)
      expect(html).toMatch(/sandbox="[^"]*allow-scripts/)
      expect(html).toContain(`href="https://www.youtube.com/watch?v=${ID}`)
      // A preview, not a playback: nothing starts by itself, and there is no card or image.
      expect(html).not.toMatch(/autoplay=1|forum-video-play|<img/)
      expect(html.match(/<iframe/g)).toHaveLength(1)
    }
    expect(render(`https://youtu.be/${ID}?t=1m30s`)).toContain('&amp;start=90')
    expect(render(`https://youtu.be/${ID}?t=1m30s`)).toContain(`href="https://www.youtube.com/watch?v=${ID}&amp;t=90s"`)
    expect(render(`Listen to this:\n\nhttps://youtu.be/${ID}\n\nWhat do you think?`)).toMatch(/<p>Listen to this:<\/p>[\s\S]*<iframe[\s\S]*<p>What do you think\?<\/p>/)
  })

  it('names a labelled video link after its text', () => {
    const html = render(`[Sidechain demo](https://youtu.be/${ID})`)
    expect(html).toContain('title="Sidechain demo"')
  })

  it('keeps links inside a sentence, a quote or a list as plain links', () => {
    for (const body of [`Watch https://youtu.be/${ID} first`, `> https://youtu.be/${ID}`, `- https://youtu.be/${ID}`, `https://youtu.be/${ID} https://youtu.be/${ID}`, `**https://youtu.be/${ID}**`]) {
      const html = render(body)
      expect(html, body).not.toContain('forum-video')
      expect(html).toContain(`href="https://youtu.be/${ID}"`)
    }
    const html = render('https://example.test/watch?v=' + ID + '\n\nhttps://www.youtube.com/playlist?list=PL12345678901')
    expect(html).not.toContain('forum-video')
  })
})

describe('YouTube videos in chat', () => {
  it('shows a click-to-play card under a message that contains a YouTube link, and nothing otherwise', () => {
    const html = renderToStaticMarkup(createElement(TextVideo, { text: `this one https://youtu.be/${ID}` }))
    expect(html).toContain('class="forum-video-play"')
    expect(html).toContain('Loads from YouTube when played')
    // The chat is read on every forum page, so it asks YouTube for nothing until the member presses play.
    expect(html).not.toMatch(/<iframe|youtube-nocookie|<img/)
    expect(renderToStaticMarkup(createElement(TextVideo, { text: 'just text' }))).toBe('')
  })
})
