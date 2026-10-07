import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recheck } from './recheck'

let visibility = 'visible'
beforeEach(() => { vi.useFakeTimers(); visibility = 'visible'; vi.stubGlobal('document', { get visibilityState() { return visibility } }) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('community recheck', () => {
  it('waits longer after each failure and starts over after a success', async () => {
    const run = vi.fn(), retry = recheck(run)
    retry.failed(); await vi.advanceTimersByTimeAsync(1999); expect(run).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(1); expect(run).toHaveBeenCalledTimes(1)
    retry.failed(); await vi.advanceTimersByTimeAsync(4999); expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1); expect(run).toHaveBeenCalledTimes(2)
    retry.succeeded(); retry.failed(); await vi.advanceTimersByTimeAsync(2000); expect(run).toHaveBeenCalledTimes(3)
  })
  it('stops growing at one minute', async () => {
    const run = vi.fn(), retry = recheck(run)
    for (let i = 0; i < 6; i++) { retry.failed(); await vi.advanceTimersByTimeAsync(60000) }
    expect(run).toHaveBeenCalledTimes(6)
    retry.failed(); await vi.advanceTimersByTimeAsync(59999); expect(run).toHaveBeenCalledTimes(6)
  })
  it('skips the check while the tab is hidden, and cancels a pending one', async () => {
    const run = vi.fn(), retry = recheck(run)
    visibility = 'hidden'; retry.failed(); await vi.advanceTimersByTimeAsync(2000); expect(run).not.toHaveBeenCalled()
    visibility = 'visible'; retry.failed(); retry.cancel(); await vi.advanceTimersByTimeAsync(60000); expect(run).not.toHaveBeenCalled()
    retry.failed(); retry.succeeded(); await vi.advanceTimersByTimeAsync(60000); expect(run).not.toHaveBeenCalled()
  })
})
