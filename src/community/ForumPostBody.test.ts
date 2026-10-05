import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ForumPostBody } from './ForumPostBody'
import { forumLink } from './forum-links'

const render = (body: string) => renderToStaticMarkup(createElement(ForumPostBody, {body}))
describe('forum post formatting', () => {
  it('groups paragraphs and quoted lines without losing line breaks', () => {
    const html=render('First line\nSecond line\n\n> A quote\n> Its next line\n\nReply')
    expect(html).toContain('<p>First line\nSecond line</p>')
    expect(html).toContain('<blockquote>\n<p>A quote\nIts next line</p>\n</blockquote>')
    expect(html).toContain('<p>Reply</p>')
  })
  it('preserves settings and quote symbols inside fenced code', () => {
    expect(render('Settings\n\n```json\n{ "gain": 0.5 }\n> literal\n\n```\n\nDone'))
      .toContain('<pre><code>{ &quot;gain&quot;: 0.5 }\n&gt; literal\n</code></pre>')
  })
  it('keeps an unfinished code fence readable', () => {
    expect(render('```\nline one\n\nline two')).toContain('<pre><code>line one\n\nline two</code></pre>')
  })
  it('renders HTML and script-like text as escaped content in every block', () => {
    const html = render('<img src=x onerror=alert(1)>\n\n> <script>alert(1)</script>\n\n```html\n<a href="javascript:alert(1)">click</a>\n```')
    expect(html).not.toMatch(/<img|<script|<a /)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;')
  })
  it('renders rich formatting, lists and explicit web links', () => {
    const html=render('## Settings\n\n**Bold** and *italic* with ~~old~~ and `code`.\n\n- One\n- Two\n\n1. First\n2. Second\n\n[Guide](https://example.test/guide)')
    for(const part of ['<h2>Settings</h2>','<strong>Bold</strong>','<em>italic</em>','<del>old</del>','<code>code</code>','<ul>','<ol>','href="https://example.test/guide"','rel="noopener noreferrer nofollow"'])expect(html).toContain(part)
  })
  it('rejects executable, local, credential-bearing and obfuscated links, and never embeds remote images', () => {
    for(const url of ['javascript:alert(1)','data:text/html,test','file:///etc/passwd','https://user:pass@example.test','//example.test','java\nscript:alert(1)',' https://example.test','https://example.test/\u0000'])expect(forumLink(url)).toBeUndefined()
    const html=render('[Bad](javascript:alert%281%29) [Data](data:text/html,test) ![External image](https://example.test/track.png)\n\n<iframe src="https://example.test"></iframe>')
    expect(html).not.toMatch(/<img|<iframe|href="javascript|href="data:/)
    expect(html).toContain('Bad')
  })
})
