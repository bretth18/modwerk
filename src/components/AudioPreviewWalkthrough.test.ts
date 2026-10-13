// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { PublicAudioPreviews } from './PublicAudioPreviews'
import { ModuleAudioDetailPreview } from './ModuleAudioPreview'
import { AUDIO_PREVIEW_GUIDE_HREF, AUDIO_PREVIEW_GUIDE_ROUTE } from './audio-preview-guide'
import { accountHref } from '../community/member-access'
import type { Session } from '../community/api'

const state = vi.hoisted(() => ({ session: { available: true, admin: false, user: null } as Session }))
vi.mock('../community/context', () => ({ useCommunity: () => ({ session: state.session }) }))
vi.mock('../community/api', () => ({ api: vi.fn(async () => ({ items: [] })) }))
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  state.session.user = null
  window.history.replaceState(null, '', '/' + AUDIO_PREVIEW_GUIDE_HREF)
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })
const render = (id = 'analog-bassdrum') => act(() => root.render(createElement(PublicAudioPreviews, { children: createElement(ModuleAudioDetailPreview, { id, name: 'Analog BD' }) })))
const click = (element: Element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

it('points visitors to the actual upload control and returns them to the walkthrough after sign-in', async () => {
  await render()
  const button = container.querySelector<HTMLButtonElement>('.audio-preview-add')!
  expect(document.activeElement).toBe(button)
  expect(container.querySelector('.audio-preview-upload-guide')?.textContent).toContain('Click Add preview below')
  expect(button.getAttribute('aria-describedby')).toBe(container.querySelector('.audio-preview-upload-guide')?.id)
  expect(container.querySelector('dialog')).toBeNull()
  await click(button)
  expect(container.querySelector('dialog[open]')?.textContent).toContain('Sign in to add an audio preview')
  expect(container.querySelector('a')?.getAttribute('href')).toBe(accountHref('login', AUDIO_PREVIEW_GUIDE_ROUTE))
  expect(container.querySelector('input[type=file]')).toBeNull()
})
it('opens the existing upload form only after a verified member clicks Add preview', async () => {
  state.session.user = { id: 'tester', username: 'tester', displayName: 'Tester', verified: true }
  await render()
  expect(container.querySelector('dialog')).toBeNull()
  await click(container.querySelector('.audio-preview-add')!)
  expect(container.querySelector('dialog[open]')?.textContent).toContain('Add audio preview')
  expect(container.querySelector('input[type=file]')?.getAttribute('accept')).toContain('.wav,.mp3,.ogg')
  expect(container.querySelector('.audio-submission-rights input')?.hasAttribute('required')).toBe(true)
})
it('can dismiss the tip, and never prompts on an unrelated module or an ordinary page', async () => {
  await render('quantizer')
  expect(container.querySelector('.audio-preview-upload-guide')).toBeNull()
  await render()
  await click(container.querySelector('[aria-label="Dismiss upload tip"]')!)
  expect(container.querySelector('.audio-preview-upload-guide')).toBeNull()
  expect(container.querySelector('.audio-preview-add')).not.toBeNull()
  window.history.replaceState(null, '', '/#module/analog-bassdrum')
  await act(() => window.dispatchEvent(new Event('hashchange')))
  expect(container.querySelector('.audio-preview-upload-guide')).toBeNull()
})
