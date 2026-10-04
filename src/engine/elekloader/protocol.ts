// SPDX-License-Identifier: GPL-3.0-or-later
// Messages between the page and the vendored elekloader builder worker, and the bridge's results.
export type BuilderMachine = 'digitakt' | 'digitone'
export type PinnedFile = { machine: BuilderMachine; release: string; file: string; sha256: string; version: string; license: string; source: { repository: string; release: string } }
export type BuilderCatalog = { commit: string; cores: PinnedFile[]; mods: (PinnedFile & { module: string })[] }

export type BuilderRequest =
  | { cmd: 'init'; base: string }
  | { cmd: 'setStock'; name: string; data: ArrayBuffer }
  | { cmd: 'addMod'; file: string; sha256: string }
  | { cmd: 'mods' }
  | { cmd: 'tick'; enabled: string[]; path: string }
  | { cmd: 'check'; enabled: string[] }
  | { cmd: 'version'; version: string; enabled: string[] }
  | { cmd: 'build'; enabled: string[]; version: string; name: string }

export type BuilderDevice = { key: string; name: string; releases: string[]; version_len: number; exact_len: boolean; recovery: string; default_version: string }
export type BuilderStock = { ok: true; dev: BuilderDevice; file: string } | { ok: false; error: string }
export type BuilderMod = { path: string; file: string; id: string; version: string; label: string; builtin?: boolean; os?: string; fits?: boolean; error?: string }
export type BuilderAdded = { ok: true; mod: BuilderMod } | { ok: false; error: string }
export type BuilderCheck = { ok: boolean; headline?: string; problems?: string[]; empty?: boolean; order?: string[] }
export type BuilderVersion = { ok: boolean; error?: string; name: string }
export type BuilderFile = { name: string; bytes: number; sha256: string; data: ArrayBuffer }
export type BuilderResult =
  | { ok: true; files: BuilderFile[]; sha256: string; bytes: number; version: string; mods: string[]; recovery: string; device: string; os: string; seconds: number }
  | { ok: false; error: string; log?: [number, string][] }

// Owner decision, 4 October 2026: Digitakt/Digitone builds use the vendored elekloader builder.
// Building and checking run locally; offering the file needs the owner's separate approval.
export const DIGI_DOWNLOADS_ENABLED = false
