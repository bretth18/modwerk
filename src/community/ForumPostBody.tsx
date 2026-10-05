import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { forumLink } from './forum-links'

const allowed = ['p','br','strong','em','del','a','code','pre','blockquote','ul','ol','li','h2','h3','hr']
export function ForumPostBody({ body }: { body: string }) {
  return <div className="forum-post-body"><Markdown remarkPlugins={[remarkGfm]} allowedElements={allowed} unwrapDisallowed
    urlTransform={value=>forumLink(value)??''}
    components={{code:({children})=><code>{typeof children==='string'?children.replace(/\n$/,''):children}</code>,a:({href,children})=>href?<a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>:<span>{children}</span>}}>{body}</Markdown></div>
}
