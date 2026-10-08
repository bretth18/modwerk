import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IssueCount, ModuleIssueCard, ModuleIssues } from './ModuleIssues'
import type { IssueTracker, PublicModuleIssue, useModuleIssues } from './issue-tracker'

const issue: PublicModuleIssue = {
  id: 'report', title: 'Knob freezes playback', url: 'https://github.com/repeat98/modwerk/issues/41', number: 41, reporter: 'listener', created_at: '2026-10-08 10:00:00', status: 'open',
  details: { device: 'Octatrack MKII · OS 1.40C', version: '0.1.0', steps: '1. Load the module\n2. Turn **knob A**', expected: 'A smooth sweep', actual: 'Playback freezes' },
}
function renderIssues(data: IssueTracker | null, options: Partial<ReturnType<typeof useModuleIssues>> = {}) {
  return renderToStaticMarkup(createElement(ModuleIssues, { id: 'miniverb', onReportIssue: () => {}, issues: { data, error: '', loading: false, status: 'open', page: 0, setStatus: () => {}, setPage: () => {}, retry: () => {}, ...options } }))
}
const tracker: IssueTracker = { tracker: 'github', issues: [issue], openCount: 12, closedCount: 3, hasMore: true, allUrl: 'https://github.com/repeat98/modwerk/issues' }

describe('module issue presentation', () => {
  it('marks a positive open count yellow and zero green with a readable label', () => {
    expect(renderToStaticMarkup(createElement(IssueCount, { count: 12 }))).toContain('data-open="true" aria-label="12 open issues">12</span>')
    expect(renderToStaticMarkup(createElement(IssueCount, { count: 0 }))).toContain('data-open="false" aria-label="0 open issues">0</span>')
    expect(renderToStaticMarkup(createElement(IssueCount, { count: 1 }))).toContain('aria-label="1 open issue"')
  })

  it('shows formatted public reproduction details, metadata and the GitHub link inline', () => {
    const html = renderToStaticMarkup(createElement(ModuleIssueCard, { issue }))
    for (const text of ['Knob freezes playback', '#41', 'Octatrack MKII', '0.1.0', 'Steps to reproduce', '<strong>knob A</strong>', 'A smooth sweep', 'Playback freezes', '@listener', 'View on GitHub']) expect(html).toContain(text)
    expect(html).toContain('href="#forum/profile/listener"')
    expect(html).toContain('target="_blank" rel="noreferrer"')
  })

  it('uses local discussion links for forum reports and safely renders reporter text', () => {
    const html = renderToStaticMarkup(createElement(ModuleIssueCard, { issue: { ...issue, url: '#forum/thread/example', number: null, status: 'closed', details: { ...issue.details!, steps: '<script>alert(1)</script>\n\n[Bad](javascript:alert%281%29)' } } }))
    expect(html).toContain('data-open="false"')
    expect(html).toContain('>Closed</span>')
    expect(html).toContain('View discussion')
    expect(html).not.toMatch(/<script|href="javascript|target="_blank"/)
  })

  it('uses the total count rather than the current page length and provides pagination', () => {
    const html = renderIssues(tracker)
    expect(html).toContain('aria-label="12 open issues"')
    expect(html).toContain('aria-label="Issue pages"')
    expect(html).toContain('disabled="">Previous</button>')
    expect(html).toContain('>Next</button>')
  })

  it('keeps closed history available and distinguishes all closed from no reports', () => {
    expect(renderIssues({ ...tracker, issues: [], openCount: 0, hasMore: false })).toContain('All reported issues have been closed.')
    expect(renderIssues({ ...tracker, issues: [], openCount: 0, closedCount: 0, hasMore: false })).toContain('No public bugs have been reported')
    expect(renderIssues({ ...tracker, issues: [{ ...issue, status: 'closed' }], openCount: 0 }, { status: 'closed' })).toContain('>Closed</span>')
  })

  it('shows loading and retry states without declaring unloaded issues closed', () => {
    const loading = renderIssues(null, { loading: true })
    expect(loading).toContain('Loading issues…')
    expect(loading).not.toContain('No open issues')
    expect(loading).not.toContain('module-issue-count')
    const failure = renderIssues(null, { error: 'Connection failed' })
    expect(failure).toContain('role="alert"')
    expect(failure).toContain('Try again')
    expect(failure).not.toContain('No open issues')
  })
})
