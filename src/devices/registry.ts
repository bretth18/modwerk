// Every Elektron machine Modwerk knows about, with what is known about modding its firmware.
// Facts about devices other than the Octatrack come from public research projects and are linked from each profile.
import MACHINES from './machines.generated.json'
import type { MachineProfile } from './machine-contract'

export type DeviceStatus = 'available' | 'preview' | 'research' | 'open'
export type StepState = 'done' | 'started' | 'open'
export type DeviceStepId = 'format' | 'rebuild' | 'boot' | 'core' | 'mods'

export type DeviceArt = {
  body: 'compact' | 'wide' | 'keys' | 'box' | 'model'
  encoders: number
  trigs: number
  pads?: number
  knobs?: number
  fader?: boolean
}

export type DeviceProfile = {
  id: string
  name: string
  variants?: string[]
  status: DeviceStatus
  summary: string
  firmware?: { releases: string[]; file: string; flash: string; recovery: string }
  steps: Record<DeviceStepId, StepState>
  research?: { label: string; url: string; note: string }[]
  sdk?: string
  art: DeviceArt
}

export const DEVICE_STEPS: { id: DeviceStepId; title: string; description: string }[] = [
  { id: 'format', title: 'Firmware file understood', description: 'The OS file’s container, packing and checksums are documented.' },
  { id: 'rebuild', title: 'Stock file rebuilt exactly', description: 'A writer rebuilds the stock OS file byte for byte from its own contents.' },
  { id: 'boot', title: 'Modified OS boots', description: 'A changed OS starts in an emulator or on a real unit and recovers to stock.' },
  { id: 'core', title: 'Core with hooks', description: 'A small core reserves memory and gives mods shared events, so several mods can run together.' },
  { id: 'mods', title: 'First mods', description: 'Reviewed mods with documentation, licences and test evidence.' },
]

// Machines come from sdk/machines/<id>/machine.json through scripts/machines.mjs; the UI keeps a compact shape.
export const DEVICES: DeviceProfile[] = (MACHINES as MachineProfile[]).map(machine => ({
  id: machine.id, name: machine.name, variants: machine.variants, status: machine.status, summary: machine.summary,
  firmware: machine.firmware && {
    releases: machine.firmware.releases.map(release => release.version),
    file: machine.firmware.releases[machine.firmware.releases.length - 1].files[0].name,
    flash: machine.firmware.flash, recovery: machine.firmware.recovery,
  },
  steps: machine.steps, research: machine.research, sdk: machine.sdk?.guide, art: machine.art,
}))

export const DEVICES_BY_ID: Record<string, DeviceProfile> = Object.fromEntries(DEVICES.map(device => [device.id, device]))

export const STATUS_LABELS: Record<DeviceStatus, string> = {
  available: 'Mods available',
  preview: 'Mods in preview',
  research: 'Research started',
  open: 'No mods yet',
}

export function deviceTitle(device: DeviceProfile) {
  return device.variants?.length ? device.name + ' ' + device.variants.join(' / ') : device.name
}

export function stepsDone(device: DeviceProfile) {
  return DEVICE_STEPS.filter(step => device.steps[step.id] === 'done').length
}

const DEVICE_KEY = 'modwerk.device'

// 'all' is the All machines library; anything else is a machine id.
export const ALL_MACHINES = 'all'

export function rememberedDevice() {
  try { const id = localStorage.getItem(DEVICE_KEY); return id && (id === ALL_MACHINES || DEVICES_BY_ID[id]) ? id : undefined } catch { return undefined }
}

export function rememberDevice(id: string) {
  try { localStorage.setItem(DEVICE_KEY, id) } catch { /* the choice is a convenience only */ }
}

// The Octatrack keeps its original routes (#library, #module/id, #configuration); other machines use #<id>/…
export type DeviceRoute = { device: DeviceProfile; view: 'library' | 'module' | 'configuration'; category?: string; moduleId?: string }

export function parseDeviceRoute(route: string): DeviceRoute | undefined {
  const [id, section, item, ...rest] = route.split('/')
  const device = DEVICES_BY_ID[id]
  if (!device || device.id === 'octatrack' || rest.length) return undefined
  if (section === undefined) return { device, view: 'library' }
  if (section === 'configuration' && item === undefined) return { device, view: 'configuration' }
  if (section === 'module' && item) return { device, view: 'module', moduleId: item }
  if (item === undefined && section) return { device, view: 'library', category: section }
  return undefined
}

export function deviceHref(id: string, path = '') {
  if (id === 'octatrack') return '#' + (path || 'library')
  if (id === ALL_MACHINES) return '#all'
  return '#' + id + (path ? '/' + path : '')
}
