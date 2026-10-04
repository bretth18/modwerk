// SPDX-License-Identifier: GPL-3.0-or-later
// Local-only stock inspection. Only metadata leaves the browser worker.
import { LINK_DEVICES, type LinkDevice } from './elemod.ts'
import { ELE3_DEVICES, mainImage, readEle3Syx } from './ele3.ts'
import { sha256Hex } from './hash.ts'

export type DigiMachine = 'digitakt' | 'digitone'
export type DigiFirmwareInspection = { machine: DigiMachine; release: string; name: string; bytes: number; sha256: string }
export const MAX_DIGI_FIRMWARE_BYTES = 8 * 1024 * 1024

/** Verify complete file identity, container integrity and the unpacked main image. */
export async function inspectDigiFirmware(machine: DigiMachine, bytes: Uint8Array, name: string, devices: readonly LinkDevice[] = LINK_DEVICES): Promise<DigiFirmwareInspection> {
  const device = devices.find(entry => entry.machine === machine)
  if (!device) throw new Error('This machine cannot read firmware yet.')
  if (!bytes.length || bytes.length > MAX_DIGI_FIRMWARE_BYTES) throw new Error('Choose one original .syx OS file for this machine.')
  const sha256 = await sha256Hex(bytes), release = device.releases.find(entry => entry.syxSha256 === sha256)
  if (!release) throw new Error('This is not a supported original ' + device.name + ' OS file. Choose OS ' + device.releases.map(entry => entry.version).join(' or ') + ' from Elektron.')
  const image = mainImage(readEle3Syx(bytes), ELE3_DEVICES[machine])
  if (image.length !== release.mainLength || await sha256Hex(image) !== release.mainSha256) throw new Error('The OS file failed its integrity check. Choose the original download again.')
  return { machine, release: release.version, name, bytes: bytes.length, sha256 }
}
