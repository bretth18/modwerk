import { createFirmwareClient, type FirmwareClient } from '../engine/client'
/**
 * The firmware worker is a 1.6 MB chunk that only the configuration pages need. This wrapper
 * has the engine client's interface but creates it, and with it the worker, on the first
 * request, so forum and library visits never download or start it.
 */
export function createLazyFirmwareClient(create: () => FirmwareClient = createFirmwareClient): FirmwareClient {
  let client: FirmwareClient | null = null, disposed = false
  const engine = () => {
    if (disposed) throw new Error('The local firmware worker was closed.')
    return client ??= create()
  }
  return {
    inspect: file => engine().inspect(file),
    validate: (moduleIds, keepStockFx2) => engine().validate(moduleIds, keepStockFx2),
    build: (moduleIds, keepStockFx2, progress) => engine().build(moduleIds, keepStockFx2, progress),
    cancelBuild: () => { client?.cancelBuild() },
    clear: () => client?.clear() ?? Promise.resolve(),
    dispose: () => { disposed = true; client?.dispose(); client = null },
  }
}
