import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import MACHINE_MODULES from '../catalog/machine-modules.json'
import type { ModwerkModule } from '../catalog/module-contract-v3'

/** Resolve committed media by the same machine-qualified ID as the community page. */
export function moduleMediaDocument(id: string) {
  const ot = MODULE_DOCUMENTS_BY_ID[id]
  if (ot) return { version: ot.version, media: ot.media.map(item => ({ ...item, lcd: !!item.otUi })) }
  const document = (MACHINE_MODULES.modules as ModwerkModule[]).find(module => module.machine + '-' + module.id === id)
  if (!document) return undefined
  return { version: document.version, media: document.media.filter(item => item.kind !== 'thumbnail').map(item => ({
    ...item, captureType: item.kind === 'audio' ? 'audio' as const : item.capture?.type ?? 'image' as const, lcd: item.kind === 'screenshot',
  })) }
}
