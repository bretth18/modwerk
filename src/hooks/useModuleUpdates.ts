import { useEffect, useRef, useState } from 'react'
import { deviceStore, openDeviceDatabase } from '../storage/device'
import { moduleViewsToRemember, type ModuleVersion } from '../catalog/module-updates'

export function useModuleUpdates(modules: readonly ModuleVersion[], openedId?: string) {
  const [viewed, setViewed] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const storeRef = useRef<ReturnType<typeof deviceStore> | null>(null)
  const pendingRef = useRef(new Map<string, string>())
  const aliveRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let database: IDBDatabase | undefined
    aliveRef.current = true
    void (async () => {
      try {
        const db = await openDeviceDatabase()
        if (cancelled) { db.close(); return }
        database = db
        const store = deviceStore(db)
        storeRef.current = store
        const restored = await store.readModuleViews()
        if (!cancelled) setViewed(restored)
      } catch {
        // When device storage is unavailable, viewing history lasts this visit.
      } finally { if (!cancelled) setReady(true) }
    })()
    return () => { cancelled = true; aliveRef.current = false; storeRef.current = null; database?.close() }
  }, [])

  useEffect(() => {
    if (!ready) return
    const records = moduleViewsToRemember(modules, viewed, openedId)
      .filter(module => pendingRef.current.get(module.id) !== module.version)
    if (!records.length) return
    const pending = pendingRef.current
    for (const module of records) pending.set(module.id, module.version)
    void Promise.allSettled(records.map(module => storeRef.current?.rememberModuleView(module))).then(() => {
      for (const module of records) if (pending.get(module.id) === module.version) pending.delete(module.id)
      if (aliveRef.current) setViewed(current => ({ ...current, ...Object.fromEntries(records.map(module => [module.id, module.version])) }))
    })
  }, [modules, viewed, openedId, ready])

  return viewed
}
