import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ForumPostBody } from './ForumPostBody'
import { forumLink } from './forum-links'
import { hardwareReportBody } from './build-follow-up'
import { readHardwareReport } from './hardware-report'

const render = (body: string) => renderToStaticMarkup(createElement(ForumPostBody, {body}))
describe('forum post formatting', () => {
  const savedReport = '**Works on my Octatrack** (OS 1.40C) · Tape Echo 0.1.2-experimental, built together with Mini Verb 0.1.2-experimental, Euclid 0.1.4-experimental, Scale Quantizer 0.1.2-experimental, VECTOR 0.2.3-experimental.'
  it('separates an existing hardware report from the member’s comment without losing build versions', () => {
    const comment = 'It sounds very good! **Freeze** would be useful.\n\n- Keep the original delay.'
    const body = savedReport + '\n\n' + comment
    const report = readHardwareReport(body)!
    expect(report).toMatchObject({ machine: 'Octatrack', os: '1.40C', module: { name: 'Tape Echo', version: '0.1.2-experimental' }, comment })
    expect(report.companions).toEqual([
      { name: 'Mini Verb', version: '0.1.2-experimental' },
      { name: 'Euclid', version: '0.1.4-experimental' },
      { name: 'Scale Quantizer', version: '0.1.2-experimental' },
      { name: 'VECTOR', version: '0.2.3-experimental' },
    ])
    const html = render(body)
    expect(html).toContain('aria-label="Member hardware report"')
    expect(html).toContain('<dt>Tested module</dt>')
    expect(html).toContain('<dt>Built together with</dt>')
    for (const module of [report.module, ...report.companions]) {
      expect(html).toContain(module.name)
      expect(html).toContain(module.version)
    }
    expect(html).toContain('</section><div class="forum-hardware-comment"><p>It sounds very good! <strong>Freeze</strong> would be useful.</p>')
    expect(html).toContain('<li>Keep the original delay.</li>')
  })
  it('formats new generated reports, including a single module with no OS', () => {
    const module = { id: 'test', name: 'Test module', version: '1.0.0-beta.1+build.2' }
    const html = render(hardwareReportBody('Digitakt', '', module, [module]))
    expect(html).toContain('Works on my Digitakt')
    expect(html).toContain('1.0.0-beta.1+build.2')
    expect(html).not.toContain('Built together with')
    expect(html).not.toContain('forum-hardware-os')
    expect(html).not.toContain('forum-hardware-comment')
  })
  it('leaves quotes, code, manual works replies and incomplete build summaries as Markdown', () => {
    for (const body of [
      '> ' + savedReport,
      '```\n' + savedReport + '\n```',
      '**Works on my Octatrack**\n\nLovely on drums.',
      savedReport.replace('VECTOR 0.2.3-experimental', 'an unknown module'),
      savedReport + ' Extra context in the same paragraph.',
    ]) {
      expect(readHardwareReport(body)).toBeNull()
      expect(render(body)).not.toContain('forum-hardware-report')
    }
    expect(render('> ' + savedReport)).toContain('<blockquote>')
    expect(render('```\n' + savedReport + '\n```')).toContain('<pre><code>')
  })
  it('escapes report fields and keeps unsafe links in the comment inert', () => {
    const html = render('**Works on my <script>device</script>** (OS <img src=x>) · <img src=x> 1.0.0.\n\n[Bad](javascript:alert%281%29)')
    expect(html).toContain('forum-hardware-report')
    expect(html).toContain('&lt;script&gt;device&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x&gt;')
    expect(html).not.toMatch(/<img|<script|href="javascript:/)
  })
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
