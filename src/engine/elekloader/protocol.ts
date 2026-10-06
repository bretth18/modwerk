// SPDX-License-Identifier: GPL-3.0-or-later
// The builder's replies as elekloader's kit types them (vendor/elekloader/kit/src/kit/protocol.ts), under the names
// Modwerk's pages use.
export type {
  Device as BuilderDevice, Stock as BuilderStock, Mod as BuilderMod, Added as BuilderAdded, Check as BuilderCheck,
  VersionField as BuilderVersion, Output as BuilderFile, Log as BuilderLog, BuildResult as BuilderResult,
} from '../../../vendor/elekloader/kit/src/kit/protocol.ts'
export type BuilderMachine = 'digitakt' | 'digitone'

// Owner decision, 4 October 2026: Digitakt/Digitone builds use the vendored elekloader builder.
// Owner approved downloads on 4 October after the pinned builder passed 27/27 native parity cases; the TypeScript
// engine that replaced it on 5 October builds the same bytes and refuses the same sets, and so does elekloader's kit,
// which runs that engine (docs/VERIFICATION.md).
export const DIGI_DOWNLOADS_ENABLED = true
