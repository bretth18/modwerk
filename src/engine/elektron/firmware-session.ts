// SPDX-License-Identifier: GPL-3.0-or-later
import type { StoredFirmware } from '../../storage/device'
import type { DigiFirmwareClient } from './firmware-client'
import type { DigiFirmwareInspection, DigiMachine } from './firmware'

// `file` is the verified original, kept in memory for local builds only.
export type DigiFirmwareView = { state: 'restoring' | 'empty' | 'reading' | 'ready'; firmware?: DigiFirmwareInspection; file?: File; saved?: boolean; error?: string; storageError?: string }
type FirmwareStorage = {
  readFirmware(machine: DigiMachine): Promise<StoredFirmware | undefined>
  saveFirmware(file: File, machine: DigiMachine): Promise<void>
  forgetFirmware(machine: DigiMachine): Promise<void>
  close(): void
}

/** A machine owns one reader and one ordered storage queue; stale checks cannot save a file. */
export function createDigiFirmwareSession(machine: DigiMachine, client: DigiFirmwareClient, openStorage: () => Promise<FirmwareStorage>, publish: (view: DigiFirmwareView) => void) {
  let generation = 0, closed = false, view: DigiFirmwareView = { state: 'restoring' }, writes = Promise.resolve()
  const update = (next: DigiFirmwareView) => { view = next; if (!closed) publish(next) }
  const storage = Promise.resolve().then(openStorage).catch(() => {
    if (!closed) update({ ...view, state: view.state === 'restoring' ? 'empty' : view.state, storageError: 'This browser cannot save firmware. You can verify a file for this session.' })
    return undefined
  })
  function persist(operation: (store: FirmwareStorage) => Promise<void>) {
    const next = writes.then(async () => { const store = await storage; if (store) await operation(store) })
    writes = next.catch(() => {})
    return next
  }
  const ready = (async () => {
    const initial = generation, store = await storage
    if (!store || closed || initial !== generation) return
    try {
      const stored = await store.readFirmware(machine)
      if (closed || initial !== generation) return
      if (!stored) { update({ state: 'empty' }); return }
      try {
        if (!(stored.blob instanceof Blob) || typeof stored.name !== 'string') throw new Error('Invalid saved file.')
        const file = new File([stored.blob], stored.name)
        const firmware = await client.inspect(machine, file)
        if (!closed && initial === generation) update({ state: 'ready', firmware, file, saved: true })
      } catch {
        if (closed || initial !== generation) return
        await persist(async current => { if (!closed && initial === generation) await current.forgetFirmware(machine) })
        if (!closed && initial === generation) update({ state: 'empty', error: 'The saved firmware failed verification and was removed. Choose the original file again.' })
      }
    } catch {
      if (!closed && initial === generation) update({ state: 'empty', storageError: 'This browser could not read or remove the saved copy. Clear this site’s browser data to remove it.' })
    }
  })()
  return {
    ready,
    async inspect(file: File) {
      if (closed) return
      const current = ++generation
      update({ ...view, state: 'reading', error: undefined })
      try {
        const firmware = await client.inspect(machine, file)
        if (closed || current !== generation) return
        update({ state: 'ready', firmware, file, storageError: view.storageError })
        try {
          let saved = false
          await persist(async store => { if (!closed && current === generation) { await store.saveFirmware(file, machine); saved = true } })
          if (!closed && current === generation && saved) update({ state: 'ready', firmware, file, saved: true })
        } catch {
          if (!closed && current === generation) update({ state: 'ready', firmware, file, storageError: 'Verified for this session. This browser could not save the file.' })
        }
      } catch (error) {
        if (!closed && current === generation) update({ ...view, state: view.firmware ? 'ready' : 'empty', error: error instanceof Error ? error.message : 'Could not read this firmware.' })
      }
    },
    async remove() {
      if (closed) return
      const current = ++generation
      update({ state: 'empty' })
      // Queue before awaiting anything: a pending write must finish before this deletion.
      try { await persist(store => store.forgetFirmware(machine)) }
      catch { if (!closed && current === generation) update({ state: 'empty', storageError: 'The saved copy could not be removed. Clear this site’s browser data to remove it.' }) }
    },
    dispose() {
      closed = true; ++generation; client.dispose()
      // Explicit removals survive navigation; the database closes after queued operations.
      void writes.then(async () => (await storage)?.close())
    },
  }
}
