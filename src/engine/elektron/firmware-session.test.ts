import { describe, expect, it, vi } from 'vitest'
import { createDigiFirmwareSession, type DigiFirmwareView } from './firmware-session'
import type { DigiFirmwareInspection, DigiMachine } from './firmware'

function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const file = (name = 'synthetic.syx') => new File([new Uint8Array([1, 2, 3])], name)
const facts = (name = 'synthetic.syx', machine: DigiMachine = 'digitakt'): DigiFirmwareInspection => ({ machine, name, release: 'TEST', bytes: 3, sha256: 'a'.repeat(64) })
function setup(machine: DigiMachine = 'digitakt') {
  const views: DigiFirmwareView[] = []
  const client = { inspect: vi.fn(async () => facts('synthetic.syx', machine)), dispose: vi.fn() }
  const store = { readFirmware: vi.fn(async () => undefined as { name: string; blob: Blob } | undefined), saveFirmware: vi.fn(async () => {}), forgetFirmware: vi.fn(async () => {}), close: vi.fn() }
  const open = deferred<typeof store>()
  const session = createDigiFirmwareSession(machine, client, () => open.promise, view => views.push(view))
  return { views, client, store, open, session, latest: () => views.at(-1)! }
}

describe('local machine firmware session', () => {
  it('revalidates a stored file through the reader on every new session', async () => {
    const test = setup('digitone')
    test.store.readFirmware.mockResolvedValue({ name: 'synthetic.syx', blob: file() })
    test.open.resolve(test.store); await test.session.ready
    expect(test.client.inspect).toHaveBeenCalledWith('digitone', expect.any(File))
    expect(test.latest()).toEqual({ state: 'ready', firmware: facts('synthetic.syx', 'digitone'), file: expect.any(File), saved: true })
    expect(test.store.saveFirmware).not.toHaveBeenCalled()
    test.session.dispose()
  })
  it('deletes a corrupt stored file only for this machine', async () => {
    const test = setup('digitone')
    test.store.readFirmware.mockResolvedValue({ name: 'synthetic.syx', blob: file() })
    test.client.inspect.mockRejectedValue(new Error('Invalid identity'))
    test.open.resolve(test.store); await test.session.ready
    expect(test.store.forgetFirmware).toHaveBeenCalledExactlyOnceWith('digitone')
    expect(test.latest()).toMatchObject({ state: 'empty', error: expect.stringContaining('removed') })
    test.session.dispose()
  })
  it('ignores a late check when the user removes the file', async () => {
    const test = setup(), check = deferred<DigiFirmwareInspection>()
    test.open.resolve(test.store); await test.session.ready
    test.client.inspect.mockReturnValue(check.promise)
    const choosing = test.session.inspect(file())
    await test.session.remove(); check.resolve(facts()); await choosing
    expect(test.latest()).toEqual({ state: 'empty' })
    expect(test.store.saveFirmware).not.toHaveBeenCalled()
    test.session.dispose()
  })
  it('removes after a pending save, even if the user navigates away', async () => {
    const test = setup(), saving = deferred<void>(), started = deferred<void>(), order: string[] = []
    test.open.resolve(test.store); await test.session.ready
    test.store.saveFirmware.mockImplementation(async () => { order.push('save'); started.resolve(); await saving.promise })
    test.store.forgetFirmware.mockImplementation(async () => { order.push('remove') })
    const choosing = test.session.inspect(file()); await started.promise
    const removing = test.session.remove(); test.session.dispose()
    saving.resolve(); await Promise.all([choosing, removing]); await Promise.resolve()
    expect(order).toEqual(['save', 'remove'])
    expect(test.latest()).toEqual({ state: 'empty' })
    expect(test.store.close).toHaveBeenCalledOnce()
  })
  it('removes a stored file while the database is still opening', async () => {
    const test = setup()
    const removing = test.session.remove(); test.session.dispose()
    test.open.resolve(test.store); await removing; await test.session.ready; await Promise.resolve()
    expect(test.store.readFirmware).not.toHaveBeenCalled()
    expect(test.store.forgetFirmware).toHaveBeenCalledExactlyOnceWith('digitakt')
    expect(test.store.close).toHaveBeenCalledOnce()
  })
  it('keeps the newest selection when checks finish out of order', async () => {
    const test = setup(), first = deferred<DigiFirmwareInspection>(), second = deferred<DigiFirmwareInspection>()
    test.open.resolve(test.store); await test.session.ready
    test.client.inspect.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const earlier = test.session.inspect(file('earlier.syx')), later = test.session.inspect(file('later.syx'))
    second.resolve(facts('later.syx')); await later; first.resolve(facts('earlier.syx')); await earlier
    expect(test.latest()).toEqual({ state: 'ready', firmware: facts('later.syx'), file: expect.objectContaining({ name: 'later.syx' }), saved: true })
    expect(test.store.saveFirmware).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'later.syx' }), 'digitakt')
    test.session.dispose()
  })
  it('retains verified session use when storage is unavailable or full', async () => {
    const unavailable = setup()
    unavailable.open.reject(new Error('denied')); await unavailable.session.ready
    await unavailable.session.inspect(file())
    expect(unavailable.latest()).toMatchObject({ state: 'ready', firmware: facts(), storageError: expect.any(String) })
    expect(unavailable.latest().saved).not.toBe(true)
    unavailable.session.dispose()
    const full = setup(); full.open.resolve(full.store); await full.session.ready
    full.store.saveFirmware.mockRejectedValue(new Error('quota'))
    await full.session.inspect(file())
    expect(full.latest()).toMatchObject({ state: 'ready', firmware: facts(), storageError: expect.stringContaining('could not save') })
    full.session.dispose()
  })
})
