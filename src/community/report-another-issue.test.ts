import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BugReportSuccess } from './BugReportNotice'
import { ReportNotifications } from './ReportNotifications'
import type { BugReportResult } from './issue-tracker'

const results: [string, BugReportResult][] = [
  ['GitHub', { id: 'r1', githubUrl: 'https://github.com/example/module/issues/1' } as BugReportResult],
  ['forum', { id: 'r2', forumThreadId: 't2' } as BugReportResult],
  ['saved', { id: 'r3' } as BugReportResult]
]

describe('reporting another issue', () => {
  it.each(results)('offers another report after a %s report is sent', (_name, report) => {
    const html = renderToStaticMarkup(createElement(BugReportSuccess, { report, onReportAnother: () => {} }))
    expect(html).toContain('>Report another issue</button>')
  })

  it.each(results)('shows no button for a %s report where the caller cannot start another', (_name, report) => {
    expect(renderToStaticMarkup(createElement(BugReportSuccess, { report }))).not.toContain('Report another issue')
  })

  it('keeps an unticked “follow releases” choice for the next report', () => {
    expect(renderToStaticMarkup(createElement(ReportNotifications, { id: 'miniverb' }))).toContain('checked=""')
    expect(renderToStaticMarkup(createElement(ReportNotifications, { id: 'miniverb', defaultChecked: false }))).not.toContain('checked')
  })
})
