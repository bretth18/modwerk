import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateDigiIssueContext } from './digi-issue-context'
import { CONFIGURATION_REQUIRED, validateIssueContext } from './issue-context'
import { machineModules } from './modules'
import { ReportConfiguration } from './ReportConfiguration'
import { defaultConfigurationChoice, resolveReportConfiguration } from './report-configuration'
import type { WorkspaceReportContext } from './report-context'

const miniverb = machineModules('octatrack').find(module => module.id === 'miniverb')!
const digihealth = machineModules('digitakt').find(module => module.moduleId === 'digihealth')!
const base = { model: 'mk2', flash: 'flashed', os: '1.40C', modules: [{ id: 'miniverb', version: '0.1.0' }], keepStockFx2: true, build: 'a'.repeat(64) }
const log = { version: 2 as const, modules: [{ id: 'repitch', version: '0.1.0' }, { id: 'miniverb', version: '0.1.2' }], os: '1.40B', stockFx2: false }
const empty: WorkspaceReportContext = { configurationName: '', modules: [], keepStockFx2: null, build: '', activeId: '', configurations: [] }
const saved: WorkspaceReportContext = {
  configurationName: 'Live set', modules: [{ id: 'miniverb', version: miniverb.version }], keepStockFx2: null, build: 'b'.repeat(64), activeId: 'live',
  configurations: [
    { id: 'studio', name: 'Studio', modules: [{ id: 'euclid', version: '0.1.0' }], keepStockFx2: null },
    { id: 'live', name: 'Live set', modules: [{ id: 'miniverb', version: miniverb.version }], keepStockFx2: null },
  ],
}
const render = (props: Parameters<typeof ReportConfiguration>[0]) => renderToStaticMarkup(createElement(ReportConfiguration, props))

describe('the configuration a report carries', () => {
  it('is required on the Worker unless a log is attached', () => {
    expect(() => validateIssueContext({ ...base, modules: [] })).toThrow(CONFIGURATION_REQUIRED)
    expect(validateIssueContext(base).modules).toEqual(base.modules)
    expect(() => validateDigiIssueContext({ machine: 'digitakt', model: 'mk1', flash: 'flashed', os: '1.53', moduleVersion: '1.0.1', modules: [], keepStockFx2: null, build: '' }, 'digitakt')).toThrow(/Choose the configuration/)
  })

  it('is read from the log when one is attached, whatever the browser sent', () => {
    expect(validateIssueContext({ ...base, modules: [] }, log)).toMatchObject({ modules: log.modules, os: '1.40B', keepStockFx2: false, build: base.build })
    // A v1 log has no FX2 setting, so the browser's answer stands.
    expect(validateIssueContext(base, { ...log, version: 1, stockFx2: null }).keepStockFx2).toBe(true)
  })

  it('lets the form take the log, the active configuration, another saved one or modules by hand', () => {
    const choice = defaultConfigurationChoice(['miniverb'])
    expect(resolveReportConfiguration(choice, saved, 'octatrack', log)).toMatchObject({ source: 'log', modules: log.modules, keepStockFx2: false, build: '' })
    expect(resolveReportConfiguration(choice, saved, 'octatrack', { ...log, modules: saved.modules }).build).toBe(saved.build)
    expect(resolveReportConfiguration(choice, saved, 'octatrack', null)).toMatchObject({ source: 'saved', name: 'Live set', modules: saved.modules, build: saved.build })
    expect(resolveReportConfiguration({ ...choice, saved: 'studio' }, saved, 'octatrack', null)).toMatchObject({ source: 'saved', name: 'Studio', build: '' })
    expect(resolveReportConfiguration({ ...choice, saved: 'deleted' }, saved, 'octatrack', null).name).toBe('Live set')
    expect(resolveReportConfiguration({ ...choice, saved: '' }, saved, 'octatrack', null)).toMatchObject({ source: 'manual', modules: [{ id: 'miniverb', version: miniverb.version }], keepStockFx2: null, build: '' })
    expect(resolveReportConfiguration({ ...choice, manualIds: ['no-such-module'] }, empty, 'octatrack', null).source).toBe('none')
    expect(resolveReportConfiguration(defaultConfigurationChoice(['digihealth']), empty, 'digitakt', null)).toMatchObject({ source: 'manual', modules: [{ id: 'digihealth', version: digihealth.version }] })
  })

  it('shows the log’s configuration without asking for one', () => {
    const html = render({ machine: 'octatrack', moduleId: 'miniverb', workspace: saved, log, value: defaultConfigurationChoice(['miniverb']), onChange: () => {} })
    expect(html).toContain('Read from OCTAMOD.LOG')
    expect(html).toContain('2 modules, base OS 1.40B, stock FX2 replaced')
    expect(html).toContain('repitch 0.1.0, miniverb 0.1.2')
    expect(html).not.toContain('<select')
    expect(html).not.toContain('type="checkbox"')
    expect(render({ machine: 'octatrack', moduleId: 'euclid', workspace: saved, log, value: defaultConfigurationChoice(['euclid']), onChange: () => {} })).toContain('The log does not list this module')
  })

  it('offers the saved configurations with the active one chosen, and warns when the module is not in it', () => {
    const html = render({ machine: 'octatrack', moduleId: 'miniverb', workspace: saved, log: null, value: defaultConfigurationChoice(['miniverb']), onChange: () => {}, os: '1.40C' })
    expect(html).toContain('Required, unless OCTAMOD.LOG is attached')
    expect(html).toContain('<option value="live" selected="">Live set (active) · 1 module</option>')
    expect(html).toContain('<option value="studio">Studio · 1 module</option>')
    expect(html).toContain('<option value="">Not saved here: tick the modules</option>')
    expect(html).toContain('configuration <strong>Live set</strong>, base OS 1.40C, 1 module, build fingerprint.')
    expect(html).not.toContain('type="checkbox"')
    expect(render({ machine: 'octatrack', moduleId: 'miniverb', workspace: saved, log: null, value: { ...defaultConfigurationChoice(['miniverb']), saved: 'studio' }, onChange: () => {} })).toContain('This module is not in that configuration')
  })

  it('asks for the modules by hand when nothing is saved, with the reported module ticked', () => {
    const html = render({ machine: 'digitakt', moduleId: 'digihealth', workspace: empty, log: null, value: defaultConfigurationChoice(['digihealth']), onChange: () => {} })
    expect(html).toContain('>Configuration <span>Required</span>')
    expect(html).toContain('No configuration is saved in this browser. Tick the modules your Digitakt runs.')
    expect(html).not.toContain('<select')
    expect(html).toContain('type="checkbox" checked=""/>' + digihealth.name)
    expect(html.match(/type="checkbox"/g)).toHaveLength(machineModules('digitakt').length)
    expect(html).not.toContain('Tick at least one module')
    expect(render({ machine: 'digitakt', moduleId: 'digihealth', workspace: empty, log: null, value: defaultConfigurationChoice([]), onChange: () => {} })).toContain('Tick at least one module')
  })
})
