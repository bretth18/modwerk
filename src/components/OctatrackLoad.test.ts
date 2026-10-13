// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OctatrackLoad } from './OctatrackLoad'
import { loadPath } from '../config/octatrack-load'
import type { LinkState, OctatrackLink } from '../engine/elekloader/octatrack-link'
import type { LoadReading } from '../engine/elekloader/upload-wire'

const reading = (ticks = 120): LoadReading => ({ ticks, frames: ticks * 50, cpu: 123, tracks1to4: 234, tracks5to8: 345, peak1to4: 456, peak5to8: 567 })
let container: HTMLDivElement, root: ReturnType<typeof createRoot>, hidden = false
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.useFakeTimers(); vi.setSystemTime(0); hidden = false; vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden); container = document.createElement('div'); document.body.append(container); root = createRoot(container) })
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function device(implementation: () => Promise<LoadReading | undefined> = async () => reading()) {
  const load = vi.fn(implementation)
  let state: LinkState = { status: 'ready', identity: { base: 'a'.repeat(64), canSubmit: true, model: 'OT' } }
  const listeners = new Set<() => void>()
  const link = { liveLoad: load, start: () => () => {}, getState: () => state, subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn) } } as unknown as OctatrackLink
  return { link, load, update(next: LinkState) { state = next; for (const listener of listeners) listener() } }
}
const render = (link: OctatrackLink | null, active = true) => act(() => root.render(createElement(OctatrackLoad, { link, active })))
it('shows current and historical readings, with separate peaks and an accessible table', async () => {
  const unit = device(); await render(unit.link)
  expect(container.textContent).toContain('12.3%'); expect(container.textContent).toContain('Recent device peak 45.6%')
  expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain('Missing readings')
  expect(container.querySelectorAll('tbody tr')).toHaveLength(1)
  expect(container.querySelector('.load-highest')?.textContent).toContain('Highest 34.5% · Tracks 5–8')
  await act(() => container.querySelector<HTMLButtonElement>('button')!.click())
  expect(container.querySelectorAll('tbody tr')).toHaveLength(0)
})
it('does no polling outside the active visible tab, during sync or after unmount', async () => {
  const unit = device(); await render(unit.link, false); expect(unit.load).not.toHaveBeenCalled()
  await render(unit.link); expect(unit.load).toHaveBeenCalledTimes(1)
  hidden = true; await act(() => document.dispatchEvent(new Event('visibilitychange')))
  await act(() => vi.advanceTimersByTimeAsync(10000)); expect(unit.load).toHaveBeenCalledTimes(1)
  hidden = false; await act(() => document.dispatchEvent(new Event('visibilitychange'))); expect(unit.load).toHaveBeenCalledTimes(2)
  await act(() => unit.update({ status: 'testing', identity: unit.link.getState().identity }))
  await act(() => vi.advanceTimersByTimeAsync(10000)); expect(unit.load).toHaveBeenCalledTimes(2)
  await render(unit.link, false); await act(() => vi.advanceTimersByTimeAsync(10000)); expect(unit.load).toHaveBeenCalledTimes(2)
})
it('never overlaps requests or appends a late reply after leaving the tab', async () => {
  let complete: (value: LoadReading) => void = () => {}
  const load = vi.fn(() => new Promise<LoadReading>(resolve => { complete = resolve })), unit = device(load)
  await render(unit.link); await act(() => vi.advanceTimersByTimeAsync(10000)); expect(load).toHaveBeenCalledTimes(1)
  await render(unit.link, false); await act(() => complete(reading()))
  expect(container.querySelectorAll('tbody tr')).toHaveLength(0)
})
it('limits history to 150 samples and treats transport failures or frozen counters as gaps', async () => {
  let ticks = 0
  const unit = device(vi.fn(async () => reading(++ticks)))
  await render(unit.link); await act(() => vi.advanceTimersByTimeAsync(302000))
  expect(container.querySelectorAll('tbody tr')).toHaveLength(150)
  unit.load.mockRejectedValueOnce(new Error('Busy')); await act(() => vi.advanceTimersByTimeAsync(2000))
  expect(container.querySelector('tbody tr:last-child')?.textContent).toContain('———')
  unit.load.mockResolvedValueOnce(reading(ticks)); await act(() => vi.advanceTimersByTimeAsync(2000))
  expect(container.textContent).toContain('Waiting for fresh')
})
it('stops reading an unsupported base and does not present self-test peaks as current load', async () => {
  const unit = device(vi.fn(async () => undefined)); await render(unit.link)
  await act(() => vi.advanceTimersByTimeAsync(10000)); expect(unit.load).toHaveBeenCalledTimes(1)
  expect(container.textContent).toContain('Live load needs a newer Modwerk base')
  expect(container.querySelector('.load-meter strong')?.textContent).toBe('—'); expect(container.querySelector('svg')).toBeNull()
})
it('expires current values during a stalled read and resets history on a different base', async () => {
  const unit = device(); await render(unit.link)
  unit.load.mockImplementationOnce(() => new Promise(() => {}))
  await act(() => vi.advanceTimersByTimeAsync(8001))
  expect(container.querySelector('.load-meter strong')?.textContent).toBe('—')
  await act(() => unit.update({ status: 'ready', identity: { base: 'b'.repeat(64), canSubmit: true, model: 'OT' } }))
  expect(container.querySelectorAll('tbody tr')).toHaveLength(0)
})
it('breaks graph lines across missing, stale or hidden intervals', () => {
  const sample = reading()
  const path = loadPath([{ at: 1000, reading: sample }, { at: 3000, reading: null }, { at: 5000, reading: sample }, { at: 15000, reading: sample }], 'cpu', 15000)
  expect(path.match(/M/g)).toHaveLength(3); expect(path).not.toContain('L')
  expect(loadPath([{ at: 0, reading: sample }], 'cpu', 300001)).toBe('')
})
it('shows one line instead of empty meters while no unit is connected', async () => {
  const unit = device(); unit.update({ status: 'idle' }); await render(unit.link)
  expect(unit.load).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Connect your Octatrack over USB')
  expect(container.querySelectorAll('.load-meter strong')).toHaveLength(3); expect(container.querySelector('svg')).toBeNull()
})
