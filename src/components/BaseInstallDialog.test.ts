// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSession, fakeUnit, FAKE_BASE } from '../dev/octatrack-link-fake'
import { OctatrackLink, type LinkDevice, type LinkUsb } from '../engine/elekloader/octatrack-link'
import { pendingBaseInstall, waitForBaseInstall } from '../config/octatrack-progress'
import { BaseInstallDialog } from './BaseInstallDialog'

vi.mock('../config/firmware-filename', () => ({ saveFirmware: vi.fn() }))
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  sessionStorage.clear()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  HTMLElement.prototype.scrollTo = () => {}
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

const button = (text: string) => [...container.querySelectorAll('button')].find(element => element.textContent === text)!
const ready = async (link: OctatrackLink, status: string) => act(async () => { await vi.waitFor(() => expect(link.getState().status).toBe(status)) })
async function mount(kind: 'stock' | 'base', expectedBase = FAKE_BASE) {
  const unit = fakeUnit(kind), onReady = vi.fn()
  let actualBase = FAKE_BASE
  const patched = new WeakSet<LinkDevice>()
  const patch = (device: LinkDevice) => {
    if (patched.has(device)) return device
    patched.add(device)
    const read = device.controlTransferIn.bind(device)
    device.controlTransferIn = async (setup, length) => {
      const result = await read(setup, length)
      if (setup.request !== 3 || !result.data) return result
      const bytes = new Uint8Array(result.data.buffer.slice(0))
      bytes.set(Uint8Array.from(actualBase.match(/../g)!.map(hex => parseInt(hex, 16))), 16)
      return { ...result, data: new DataView(bytes.buffer) }
    }
    return device
  }
  const wrapped = new Map<Parameters<LinkUsb['addEventListener']>[1], Parameters<LinkUsb['addEventListener']>[1]>()
  const usb: LinkUsb = {
    requestDevice: async options => patch(await unit.usb.requestDevice(options)),
    getDevices: async () => (await unit.usb.getDevices()).map(patch),
    addEventListener(type, listener) { const forward: Parameters<LinkUsb['addEventListener']>[1] = event => listener({ device: patch(event.device) }); wrapped.set(listener, forward); unit.usb.addEventListener(type, forward) },
    removeEventListener(type, listener) { unit.usb.removeEventListener(type, wrapped.get(listener) ?? listener) },
  }
  const link = new OctatrackLink(usb, fakeSession(unit))
  await act(async () => root.render(createElement(BaseInstallDialog, { link, firmwareReady: true, onChooseFirmware() {},
    buildBase: async () => ({ buffer: new ArrayBuffer(0), sha256: 'b'.repeat(64), base: expectedBase }), returnSetId: 'studio', onClose() {}, onReady })))
  await ready(link, kind === 'base' ? 'ready' : 'stock')
  return { unit, link, onReady, setBase: (base: string) => { actualBase = base } }
}

describe('resuming the first base installation', () => {
  it('explains DSP memory sharing alongside USB setup without hiding the explanation on phones', async () => {
    const link = new OctatrackLink(undefined)
    await act(() => root.render(createElement(BaseInstallDialog, { link, launch: true, firmwareReady: false, onChooseFirmware() {}, onClose() {}, onReady() {} })))
    expect(container.querySelector('h2')?.textContent).toContain('Sync to Octatrack')
    expect(container.querySelector('#base-install-intro')?.textContent).toContain('modules go straight from this page')
    const benefit = [...container.querySelectorAll('.link-promises li')].find(element => element.querySelector('strong')?.textContent === 'Better DSP memory use')!
    expect(benefit.textContent).toContain('Effects load as needed, sharing one copy of their code between tracks on the same DSP core.')
    expect(benefit.querySelector('.link-feature-rest')).toBeNull()
    expect(container.textContent).toContain('Stock effects stay')
  })
  it('waits through an original-OS connection and returns to the set when a base reconnects', async () => {
    waitForBaseInstall('b'.repeat(64), FAKE_BASE, undefined, 'studio')
    const { unit, link, onReady } = await mount('stock')
    expect(container.textContent).toContain('Waiting for your Octatrack')
    expect(onReady).not.toHaveBeenCalled()
    await act(async () => { unit.unplug(); unit.plug('base') })
    await ready(link, 'ready')
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(pendingBaseInstall()).toBeUndefined()
  })
  it('shows one task at a time and only promotes Connect after a download', async () => {
    const { onReady } = await mount('stock')
    expect(button('Connect Octatrack')).toBeUndefined()
    expect(container.textContent).not.toContain('Copy the file to your card')
    await act(() => container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click())
    await act(async () => button('Download base .bin').click())
    expect(container.querySelector('h3')?.textContent).toBe('Copy the file to your card')
    expect(container.querySelector('input[type=checkbox]')).toBeNull()
    await act(() => button('File copied ').click())
    expect(container.querySelector('h3')?.textContent).toBe('Install it on your Octatrack')
    expect(container.textContent).toContain('explicitly asks you to restart')
    await act(() => button('Octatrack has started ').click())
    expect(button('Connect Octatrack').className).toContain('button-primary')
    expect(onReady).not.toHaveBeenCalled()
    await act(() => button('Back').click())
    expect(container.querySelector('h3')?.textContent).toBe('Install it on your Octatrack')
    expect(pendingBaseInstall()?.returnSetId).toBe('studio')
  })
  it('offers a browser handoff instead of a dead connect action without WebUSB', async () => {
    waitForBaseInstall('b'.repeat(64), FAKE_BASE)
    const link = new OctatrackLink(undefined)
    await act(() => root.render(createElement(BaseInstallDialog, {link,firmwareReady:false,onChooseFirmware(){},onClose(){},onReady(){}})))
    expect(container.textContent).toContain('Chrome or Edge on a computer')
    expect(button('Connect Octatrack')).toBeUndefined()
    expect(button('Close guide')).toBeDefined()
  })
  it('does not treat a download while already connected as a completed installation', async () => {
    const expected = 'c'.repeat(64)
    const { unit, link, onReady, setBase } = await mount('base', expected)
    await act(() => container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click())
    await act(async () => button('Download base .bin').click())
    expect(pendingBaseInstall()).toEqual({ sha256: 'b'.repeat(64), expectedBase: expected, previousBase: FAKE_BASE, returnSetId: 'studio' })
    expect(onReady).not.toHaveBeenCalled()
    await act(async () => unit.unplug())
    await act(async () => unit.plug('base'))
    await ready(link, 'ready')
    expect(onReady).not.toHaveBeenCalled()
    for (const base of ['d'.repeat(64), 'b'.repeat(64)]) {
      await act(async () => { unit.unplug(); setBase(base); unit.plug('base') })
      await ready(link, 'ready')
      expect(onReady).not.toHaveBeenCalled()
      expect(pendingBaseInstall()?.returnSetId).toBe('studio')
    }
    await act(async () => { unit.unplug(); setBase(expected); unit.plug('base') })
    await ready(link, 'ready')
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(pendingBaseInstall()).toBeUndefined()
  })
  it('does not label an existing submit-capable base as a newly installed download', async () => {
    const { onReady } = await mount('base')
    expect(onReady).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('Confirmed the downloaded')
  })
  it('resumes a pending first install when the page is reopened with the base already present', async () => {
    waitForBaseInstall('b'.repeat(64), FAKE_BASE, undefined, 'studio')
    const { onReady } = await mount('base')
    expect(onReady).toHaveBeenCalledTimes(1)
  })
})
