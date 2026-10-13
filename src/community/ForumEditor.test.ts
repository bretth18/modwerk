// @vitest-environment jsdom
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RichTextEditor } from './ForumEditor'

vi.mock('./RichTextEditor', () => { throw new TypeError('Failed to fetch dynamically imported module') })
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('keeps the discussion and navigation mounted when the formatting bundle fails, with an editable saved draft', async () => {
  function Discussion() {
    const [value, onChange] = useState('**My saved reply**')
    return createElement('div', null, createElement('nav', null, 'Module library'), createElement('h1', null, 'The discussion'), createElement('form', null, createElement(RichTextEditor, { id: 'reply', name: 'body', label: 'Your reply', value, onChange })))
  }
  await act(async () => root.render(createElement(Discussion)))
  expect(container.querySelector('nav')?.textContent).toBe('Module library')
  expect(container.querySelector('h1')?.textContent).toBe('The discussion')
  expect(container.textContent).toContain('Formatting is unavailable')
  const input = container.querySelector('textarea')!
  expect(input.value).toBe('**My saved reply**')
  expect(input.getAttribute('aria-label')).toBe('Your reply')
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'My updated reply')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(new FormData(container.querySelector('form')!).getAll('body')).toEqual(['My updated reply'])
})

it('keeps disabled and updated draft props in the fallback after a cached editor failure', async () => {
  await act(async () => root.render(createElement(RichTextEditor, { id: 'reply', label: 'Your reply', value: 'A draft', onChange: vi.fn() })))
  await act(() => root.render(createElement(RichTextEditor, { id: 'reply', label: 'Your reply', value: 'Updated draft', disabled: true, placeholder: 'Reply here', onChange: vi.fn() })))
  const input = container.querySelector('textarea')!
  expect(input.value).toBe('Updated draft')
  expect(input.disabled).toBe(true)
  expect(input.placeholder).toBe('Reply here')
  expect(input.maxLength).toBe(12000)
})
