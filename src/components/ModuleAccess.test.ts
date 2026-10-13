// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ModuleAccess } from './ModuleAccess'
import { MODULE_DOCUMENTS } from '../catalog/documents'

const render = (id: string) => {
  const element = document.createElement('div')
  element.innerHTML = renderToStaticMarkup(createElement(ModuleAccess, { id }))
  return element
}

describe('module access page section', () => {
  // The documentation gate (scripts/module-documentation.mjs) accepts a tutorial in any of these records; an owner-approved
  // update without a qualification record keeps it in tests.documentation.
  it('shows the quick tutorial of every module, wherever its record keeps it', () => {
    for (const module of MODULE_DOCUMENTS.filter(module => module.access)) {
      const tests = module.tests
      const documentation = tests.retainedEvidence?.documentation ?? tests.qualification?.documentation ?? tests.releaseWaiver?.documentation ?? tests.documentation
      if (!documentation) continue
      const steps = [...render(module.id).querySelectorAll('h3 + ol li')].map(item => item.textContent)
      expect(steps, module.id).toEqual(documentation.tutorial.steps)
    }
  })

  it('shows Mini Verb’s tutorial, kept only in tests.documentation', () => {
    const miniverb = MODULE_DOCUMENTS.find(module => module.id === 'miniverb')!
    expect(miniverb.tests.qualification).toBeUndefined()
    expect(render('miniverb').querySelector('h3')?.textContent).toBe(miniverb.tests.documentation!.tutorial.title)
  })
})
