import { useState, type ReactNode } from 'react'
import { ModuleCommunity } from '../community/ModuleCommunity'
import { ModuleUpdateButton } from '../community/ModuleUpdateButton'
import { Icon } from './Icon'

type DetailTab = 'Overview' | 'Media' | 'Discussion'
const tabs: DetailTab[] = ['Overview', 'Media', 'Discussion']

export function ModuleDetailLayout({ id, title, family, detail, author, authorUrl, description, selected, onToggle, backHref, backLabel, preview, resources, notice, guide, issueReport }: {
  id: string; title: string; family: string; detail: string; author: string; authorUrl: string; description: string
  selected: boolean; onToggle: () => void; backHref: string; backLabel: string
  preview: ReactNode; resources: ReactNode; notice?: ReactNode; guide: ReactNode
  issueReport: (openRequest: number) => ReactNode
}) {
  const [tab, setTab] = useState<DetailTab>('Overview')
  const [issueOpenRequest, setIssueOpenRequest] = useState(0)
  const [discussionCount, setDiscussionCount] = useState<number | null>(null)
  function showDiscussion() {
    setTab('Discussion')
    document.getElementById('tab-Discussion')?.focus()
  }
  function showIssueReport() { setTab('Overview'); setIssueOpenRequest(request => request + 1) }
  return <div className="detail-page">
    <div className="module-page-actions">
      <a className="back-link" href={backHref}><Icon name="back" size={15} />{backLabel}</a>
      <button type="button" className="button button-danger module-issue-action" onClick={showIssueReport}><Icon name="message" size={15} />Report an issue</button>
    </div>
    <section className="detail-hero detail-hero-with-resources" aria-labelledby="module-title">
      {preview}
      <div className="detail-intro">
        <div className="detail-tags"><span className="pill">{family}</span><span className="subtle">{detail}</span></div>
        <h1 id="module-title">{title}</h1>
        <a className="author-link" href={authorUrl} target="_blank" rel="noreferrer">by {author} ↗</a>
        <p>{description}</p>
        {notice}
        <div className="detail-rating"><button className="text-button" onClick={showDiscussion}>Reviews & discussion{discussionCount !== null && <span className="tab-count">{discussionCount}<span className="sr-only">{discussionCount === 1 ? ' comment' : ' comments'}</span></span>}</button></div>
        <button className={'button ' + (selected ? 'button-added' : 'button-primary')} onClick={onToggle} aria-pressed={selected}><Icon name={selected ? 'check' : 'plus'} size={16} />{selected ? 'Added to configuration' : 'Add to configuration'}</button>
        <ModuleUpdateButton id={id} />
      </div>
      {resources}
    </section>
    <div className="detail-tabs" role="tablist" aria-label="Module information">
      {tabs.map(value => <button key={value} role="tab" id={'tab-' + value} aria-selected={tab === value} aria-controls="detail-content" tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
        let next: DetailTab | undefined
        if (event.key === 'ArrowRight') next = tabs[(tabs.indexOf(value) + 1) % tabs.length]
        if (event.key === 'ArrowLeft') next = tabs[(tabs.indexOf(value) + 2) % tabs.length]
        if (event.key === 'Home') next = tabs[0]
        if (event.key === 'End') next = tabs[2]
        if (next) { event.preventDefault(); setTab(next); document.getElementById('tab-' + next)?.focus() }
      }}>{value}{value === 'Discussion' && discussionCount !== null && <span className="tab-count">{discussionCount}<span className="sr-only">{discussionCount === 1 ? ' comment' : ' comments'}</span></span>}</button>)}
    </div>
    <div id="detail-content" role="tabpanel" aria-labelledby={'tab-' + tab} tabIndex={0}>
      {tab === 'Overview' && <>
        <ModuleCommunity id={id} mode="overview" onDiscuss={showDiscussion} onDiscussionCount={setDiscussionCount} />
        <div className="module-guide">{guide}</div>
      </>}
      {tab === 'Media' && <ModuleCommunity id={id} mode="media" onDiscussionCount={setDiscussionCount} />}
      {tab === 'Discussion' && <ModuleCommunity id={id} mode="discussion" onReportIssue={showIssueReport} onDiscussionCount={setDiscussionCount} />}
      {/* Stays mounted on the other tabs so a report in progress is not lost. */}
      <div hidden={tab !== 'Overview'}>{issueReport(issueOpenRequest)}</div>
    </div>
  </div>
}
