import { useEffect, useRef, useState } from 'react'
import { openDeviceDatabase, deviceStore } from '../storage/device'
import { createDigiFirmwareClient } from '../engine/elektron/firmware-client'
import { createDigiFirmwareSession, type DigiFirmwareView } from '../engine/elektron/firmware-session'
import type { DigiMachine } from '../engine/elektron/firmware'

/** Every machine restores only its own file and verifies every stored byte again. */
export function useDigiFirmware(machine: DigiMachine) {
  const session = useRef<ReturnType<typeof createDigiFirmwareSession> | null>(null)
  const [result, setResult] = useState<{ machine: DigiMachine; view: DigiFirmwareView }>({ machine, view: { state: 'restoring' } })
  useEffect(() => {
    const current = createDigiFirmwareSession(machine, createDigiFirmwareClient(), async () => {
      const database = await openDeviceDatabase()
      return { ...deviceStore(database), close: () => database.close() }
    }, view => setResult({ machine, view }))
    session.current = current
    return () => { current.dispose(); if (session.current === current) session.current = null }
  }, [machine])
  const view: DigiFirmwareView = result.machine === machine ? result.view : { state: 'restoring' }
  return { ...view, inspect: (file: File) => session.current?.inspect(file), remove: () => session.current?.remove() }
}
