import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Session } from './api'
import { BuildFollowUp } from './BuildFollowUp'
import { builtModules, hardwareReportBody } from './build-follow-up'
import { CommunityContext } from './context'
import { communityModule } from './modules'

const member: Session = { available: true, admin: false, user: { id: 'member', displayName: 'Member', username: 'member', verified: true } }
function render(session: Session, ids: string[]) {
  return renderToStaticMarkup(createElement(CommunityContext.Provider, { value: { session, developer: null, catalog: [], refresh: async () => {}, refreshDeveloper: async () => {} } },
    createElement(BuildFollowUp, { machine: 'Octatrack', os: '1.40C', modules: builtModules(ids) })))
}

describe('after a firmware download', () => {
  it('names the catalog modules of a build with the versions the build used', () => {
    const miniverb = communityModule('miniverb')!, digi = communityModule('digitakt-digihealth')!
    expect(builtModules(['miniverb', 'not-a-module'], { miniverb: '9.9.9' })).toEqual([{ id: 'miniverb', name: miniverb.name, version: '9.9.9' }])
    expect(builtModules(['digitakt-digihealth'])).toEqual([{ id: 'digitakt-digihealth', name: digi.name, version: digi.version }])
  })
  it('writes a hardware report that names the unit, the OS and the rest of the build', () => {
    const [verb, echo] = [{ id: 'a', name: 'Verb', version: '1.0.0' }, { id: 'b', name: 'Echo', version: '0.2.0' }]
    expect(hardwareReportBody('Octatrack', '1.40C', verb, [verb, echo], '')).toBe('**Works on my Octatrack** (OS 1.40C) · Verb 1.0.0, built together with Echo 0.2.0.')
    expect(hardwareReportBody('Digitakt', '', verb, [verb], '  Lovely on drums.  ')).toBe('**Works on my Digitakt** · Verb 1.0.0.\n\nLovely on drums.')
    expect(hardwareReportBody('Digitakt', '', verb, [verb], 'x'.repeat(3000)).length).toBeLessThan(2100)
  })
  it('offers members a hardware report on each module after automatic update follows', () => {
    const html = render(member, ['miniverb'])
    expect(html).toContain('After you flash')
    expect(html).not.toContain('Follow this module')
    expect(html).toContain('Works on my Octatrack')
    expect(html).toContain('href="#module/')
    expect(html).toContain('?report=1')
  })
  it('shows nothing without a verified member or without catalog modules', () => {
    expect(render({ ...member, user: { ...member.user!, verified: false } }, ['miniverb'])).toBe('')
    expect(render(member, [])).toBe('')
  })
})
