// SPDX-License-Identifier: GPL-3.0-or-later
import { MAX_DIGI_FIRMWARE_BYTES, type DigiFirmwareInspection, type DigiMachine } from './firmware'

export function createDigiFirmwareClient() {
  let nextId = 0, disposed = false
  const pending = new Map<number, { resolve: (value: DigiFirmwareInspection) => void; reject: (error: Error) => void }>()
  const worker = new Worker(new URL('./firmware.worker.ts', import.meta.url), { type: 'module' })
  function rejectAll(message: string) { for (const task of pending.values()) task.reject(new Error(message)); pending.clear() }
  worker.onerror = () => { disposed = true; worker.terminate(); rejectAll('The local firmware reader stopped. Reload to try again.') }
  worker.onmessage = (event: MessageEvent<{ id: number; type: 'inspection' | 'error'; inspection: DigiFirmwareInspection; message: string }>) => {
    const task = pending.get(event.data.id)
    if (!task) return
    pending.delete(event.data.id)
    if (event.data.type === 'inspection') task.resolve(event.data.inspection)
    else task.reject(new Error(event.data.message))
  }
  return {
    async inspect(machine: DigiMachine, file: File) {
      if (disposed) throw new Error('The local firmware reader was closed.')
      if (!file.size || file.size > MAX_DIGI_FIRMWARE_BYTES || !file.name.toLowerCase().endsWith('.syx')) throw new Error('Choose the extracted original .syx OS file, not the ZIP archive.')
      const buffer = await file.arrayBuffer()
      if (disposed) throw new Error('The local firmware reader was closed.')
      const id = ++nextId
      return new Promise<DigiFirmwareInspection>((resolve, reject) => {
        pending.set(id, { resolve, reject })
        try { worker.postMessage({ id, machine, buffer, name: file.name }, [buffer]) } catch (error) { pending.delete(id); reject(error) }
      })
    },
    dispose() { disposed = true; worker.terminate(); rejectAll('The local firmware reader was closed.') },
  }
}
export type DigiFirmwareClient = ReturnType<typeof createDigiFirmwareClient>
