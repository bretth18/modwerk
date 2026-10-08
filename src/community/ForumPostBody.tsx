import type { ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { forumLink, youTubeVideo } from './forum-links'
import { YouTubeEmbed } from './YouTubeEmbed'
import { splitMentions } from './forum-contract'
import { profileHref } from '../routing'
import { Icon } from '../components/Icon'
import { readHardwareReport, type HardwareReport } from './hardware-report'

type Node = { type: string; value?: string; url?: string; children?: Node[]; data?: Record<string, unknown> }
/** Turns @names in text into profile links, leaving code and existing links alone. The href is rebuilt in the `a` renderer. */
function remarkMentions() {
  function walk(node: Node) {
    if (!node.children) return
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index]
      if (child.type === 'text' && child.value && node.type !== 'link' && node.type !== 'linkReference') {
        const parts = splitMentions(child.value)
        if (!parts.some(part => part.type === 'mention')) continue
        const nodes: Node[] = parts.map(part => part.type === 'mention' ? { type: 'link', url: 'mention:' + part.value, data: { hProperties: { className: 'forum-mention' } }, children: [{ type: 'text', value: '@' + part.value }] } : { type: 'text', value: part.value })
        node.children.splice(index, 1, ...nodes); index += nodes.length - 1
      } else if (child.type !== 'inlineCode' && child.type !== 'code') walk(child)
    }
  }
  return (tree: Node) => { walk(tree) }
}
/** A paragraph that is only a YouTube link becomes a video. Links inside a sentence, a quote or a list stay links. */
function remarkVideos() {
  return (tree: Node) => {
    for (const node of tree.children ?? []) {
      const [link, ...rest] = node.children ?? []
      if (node.type !== 'paragraph' || link?.type !== 'link' || rest.length || !link.url) continue
      const video = youTubeVideo(link.url)
      if (!video) continue
      const label = (link.children ?? []).map(child => child.value ?? '').join('')
      node.data = { hProperties: { 'data-youtube': video.id, 'data-start': video.start, 'data-label': label === link.url ? '' : label } }
    }
  }
}
const mentionName = (node: unknown) => { const text = (node as { children?: { value?: string }[] })?.children?.[0]?.value ?? ''; return text.startsWith('@') ? text.slice(1) : '' }

// remarkVideos marks the paragraphs that hold a video as data attributes.
function Paragraph({ children, ...props }: { children?: ReactNode }) {
  const data = props as Record<string, unknown>
  return typeof data['data-youtube'] === 'string' ? <YouTubeEmbed autoload video={{ id: data['data-youtube'], start: Number(data['data-start']) || 0 }} label={String(data['data-label'] ?? '')} /> : <p>{children}</p>
}

const allowed = ['p','br','strong','em','del','a','code','pre','blockquote','ul','ol','li','h2','h3','hr']
function PostMarkdown({ body }: { body: string }) {
  return <Markdown remarkPlugins={[remarkGfm, remarkMentions, remarkVideos]} allowedElements={allowed} unwrapDisallowed
    urlTransform={value=>forumLink(value)??''}
    components={{p:Paragraph,code:({children})=><code>{typeof children==='string'?children.replace(/\n$/,''):children}</code>,a:({href,children,className,node})=>String(className??'').includes('forum-mention')&&mentionName(node)?<a className="forum-mention" href={profileHref(mentionName(node))}>{children}</a>:href?<a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>:<span>{children}</span>}}>{body}</Markdown>
}

function HardwareReportSummary({ report }: { report: HardwareReport }) {
  return <section className="forum-hardware-report" aria-label="Member hardware report">
    <div className="forum-hardware-heading"><Icon name="check" size={16}/><strong>Works on my {report.machine}</strong>{report.os && <span className="forum-hardware-os">OS {report.os}</span>}</div>
    <dl className="forum-hardware-build">
      <div><dt>Tested module</dt><dd><strong>{report.module.name}</strong><span className="forum-hardware-version">{report.module.version}</span></dd></div>
      {report.companions.length > 0 && <div><dt>Built together with</dt><dd><ul className="forum-hardware-modules">{report.companions.map((module, index) => <li key={index}><span>{module.name}</span><span className="forum-hardware-version">{module.version}</span></li>)}</ul></dd></div>}
    </dl>
  </section>
}

export function ForumPostBody({ body }: { body: string }) {
  const report = readHardwareReport(body)
  return <div className="forum-post-body">{report ? <><HardwareReportSummary report={report}/>{report.comment && <div className="forum-hardware-comment"><PostMarkdown body={report.comment}/></div>}</> : <PostMarkdown body={body}/>}</div>
}
