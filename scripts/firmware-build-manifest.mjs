// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

/** Metadata only: bind local developer builds to the engine and policies deployed by the site. */
export async function readFirmwareBuildManifest(root) {
  const files = {}
  async function walk(path) {
    for (const entry of (await readdir(resolve(root, path), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = path + '/' + entry.name
      if (entry.isSymbolicLink()) throw new Error('Builder inputs must not contain symlinks: ' + name)
      if (entry.isDirectory()) await walk(name)
      else if (!/\.(test|d)\.[cm]?[jt]sx?$/.test(name)) files[name] = sha256(await readFile(resolve(root, name)))
    }
  }
  for (const path of ['src/engine', 'src/catalog', 'src/config', 'vendor/elekloader']) await walk(path)
  for (const path of ['sdk/catalog.json', 'src/community/modules.ts', 'src/community/module-changelogs.json', 'package-lock.json']) files[path] = sha256(await readFile(resolve(root, path)))
  const kit = JSON.parse(await readFile(resolve(root, 'vendor/elekloader/kit/kit.json'), 'utf8'))
  return {
    format: 'modwerk-firmware-builder-v1',
    inputsSha256: sha256(JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)))),
    elekloader: { version: kit.version, commit: kit.commit, protocol: kit.protocol, catalogSha256: files['vendor/elekloader/catalog/catalog.json'] },
  }
}
