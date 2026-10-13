// SPDX-License-Identifier: GPL-3.0-or-later
// The builder's replies as elekloader's kit types them (vendor/elekloader/kit/src/kit/protocol.ts), under the names
// Modwerk's pages use.
export type {
  Device as BuilderDevice, Stock as BuilderStock, Mod as BuilderMod, Added as BuilderAdded, Check as BuilderCheck,
  VersionField as BuilderVersion, Output as BuilderFile, Log as BuilderLog, BuildResult as BuilderResult,
} from '../../../vendor/elekloader/kit/src/kit/protocol.ts'
export type BuilderMachine = 'digitakt' | 'digitakt-ii' | 'digitone'

// Digitakt/Digitone mk1 downloads retain their owner-approved parity gate. Digitakt II is a separate OS 1.17
// research preview: its builder is wired for local checks, but downloads remain disabled pending qualification/review.
export const DIGI_DOWNLOADS_ENABLED: Readonly<Record<BuilderMachine, boolean>> = {
  digitakt: true,
  'digitakt-ii': false,
  digitone: true,
}

export function digiDownloadsEnabled(machine: string): boolean {
  return Object.hasOwn(DIGI_DOWNLOADS_ENABLED, machine) && DIGI_DOWNLOADS_ENABLED[machine as BuilderMachine] === true
}
