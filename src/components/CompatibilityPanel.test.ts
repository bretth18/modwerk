import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CompatibilityPanel } from './CompatibilityPanel'
import { explainBuildFailure } from '../engine/build-errors'
import type { BuildView } from '../hooks/useFirmwareBuild'

const reportedSelection = ['euclid', 'vector', 'sidechain-compressor', 'tapehead', 'tapeecho', 'miniverb', 'previewvol', 'repitch']
function render(state: BuildView['state'], error?: string, ids = reportedSelection) {
  return renderToStaticMarkup(createElement(CompatibilityPanel, { ids, keepStockFx2: false, buildState: state, buildError: error, onFix: () => {} }))
}

describe('configuration placement status', () => {
  it.each(['mute-modes', 'recorder-loop-fix'])('shows the placement refusal for the reported selection with %s', id => {
    const error = explainBuildFailure('A module menu cave exceeds its reserved region.')
    const html = render('error', error, [...reportedSelection, id])
    expect(html).toContain('Configuration needs attention')
    expect(html).toContain(error)
    expect(html).toContain('menu and patch space')
    expect(html).not.toContain('Choose your base firmware')
  })

  it('shows worker and firmware failures without implying the base is absent', () => {
    const error = 'The local firmware worker stopped. Choose your file again or reload the page.'
    expect(render('error', error)).toContain(error)
    expect(render('error')).toContain('Review the build details below, then check again.')
    expect(render('error')).not.toContain('Choose your base firmware')
  })

  it('shows checks in progress after firmware selection', () => {
    const html = render('validating')
    expect(html).toContain('Checking configuration')
    expect(html).toContain('Checking whether your modules fit in the selected base firmware')
    expect(html).not.toContain('Choose your base firmware')
  })

  it('retains the firmware prompt before checks and the checked state afterwards', () => {
    expect(render('empty')).toContain('Choose your base firmware for placement checks.')
    expect(render('valid')).toContain('Configuration fits')
    expect(render('valid')).toContain('Selection and placement checks passed locally.')
  })

  it('keeps declared conflict explanations and fixes ahead of the build error', () => {
    const html = render('error', 'Placement failed', ['midi-scenes', 'repitch'])
    expect(html).toContain('Build MIDI Scenes on its own')
    expect(html).toContain('Remove MIDI Scenes')
    expect(html).not.toContain('Placement failed')
  })
})
