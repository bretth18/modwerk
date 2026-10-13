import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { hasBetaUi } from './beta-access'
import { BetaUi } from './beta-ui'
import { emptySession } from './context'
import { newConfiguration } from '../config/workspace'
import { ConfigurationHeader } from '../components/ConfigurationLayout'
import { AddButton } from '../components/ModuleCard'

const member = { id: 'member', username: 'tester', displayName: 'Tester', verified: true }
const render = (element: ReactElement, beta: boolean) => renderToStaticMarkup(createElement(BetaUi.Provider, { value: beta }, element))

describe('beta or classic interface per session', () => {
  it('shows the beta interface to beta testers and verified administrators, and main’s to everyone else', () => {
    const tester = { ...emptySession, user: { ...member, betaTester: true } }
    expect(hasBetaUi(tester, false)).toBe(true)
    expect(hasBetaUi({ ...emptySession, admin: true, user: member }, false)).toBe(true)
    expect(hasBetaUi({ ...emptySession, user: member }, false)).toBe(false)
    expect(hasBetaUi({ ...tester, user: { ...member, betaTester: false } }, false)).toBe(false) // revoked
    expect(hasBetaUi(emptySession, false)).toBe(false) // a visitor
    expect(hasBetaUi(emptySession, true)).toBe(true) // a dev build
  })

  it('keeps main’s words and menu without the beta, and says module set with it', () => {
    const set = newConfiguration('Live set')
    const header = createElement(ConfigurationHeader, { kicker: 'YOUR WORKSPACE', meta: 'Octatrack', configuration: set, configurations: [set], onSelect: vi.fn(), onDialog: vi.fn(), onImport: vi.fn(), shareHref: '#forum', canReport: true, onReport: vi.fn() })
    const button = createElement(AddButton, { name: 'Mini Verb', selected: false, onToggle: vi.fn() })
    expect(renderToStaticMarkup(header)).toBe(render(header, false)) // outside the provider is the classic interface
    expect(render(header, false)).toContain('aria-label="Choose configuration"')
    expect(render(header, false)).not.toContain('module set')
    expect(render(button, false)).toContain('aria-label="Add Mini Verb to configuration"')
    expect(render(header, true)).toContain('aria-label="Choose module set"')
    expect(render(button, true)).toContain('aria-label="Add Mini Verb to module set"')
  })
})
