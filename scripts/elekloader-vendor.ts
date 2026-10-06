// SPDX-License-Identifier: GPL-3.0-or-later
// The vendored elekloader kit (vendor/elekloader/kit) and the catalog Modwerk offers with it (vendor/elekloader/catalog),
// both pinned by vendor/elekloader/elekloader.lock.json, as the kit's own `tools/kit.ts verify --lock` checks them.
// Verifies every pinned file offline, and serves/emits the catalog and its files under elekloader/, where the kit's
// worker loads them. The kit's sources are bundled into the page and the worker through their imports.
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { parseCatalog, type Catalog } from '../vendor/elekloader/kit/src/kit/catalog.ts'

export const ELEKLOADER_SITE = 'elekloader/'
type Lock = { schema: number; kind: string; kit: { version: string; protocol: number; files: Record<string, string> }; catalog: { revision: string; sha256: string } }
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

async function walk(folder: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(folder, entry.name)
    if (entry.isSymbolicLink()) throw new Error('Vendored elekloader must not contain links: ' + path)
    if (entry.isDirectory()) out.push(...await walk(path))
    else out.push(path)
  }
  return out
}
const names = async (folder: string) => (await walk(folder)).map(path => relative(folder, path).split(sep).join('/'))

/** Throws when any vendored byte differs from the lock; -> the lock, the catalog, and the site assets as [path, bytes]. */
export async function readVendoredElekloader(root: string): Promise<{ lock: Lock; catalog: Catalog; assets: [string, Buffer][] }> {
  const folder = resolve(root, 'vendor/elekloader'), kit = resolve(folder, 'kit'), dir = resolve(folder, 'catalog')
  const lock = JSON.parse(await readFile(resolve(folder, 'elekloader.lock.json'), 'utf8')) as Lock
  if (lock.schema !== 1 || lock.kind !== 'elekloader-kit-lock' || !lock.kit?.files || !lock.catalog?.sha256) throw new Error('Invalid elekloader lock file')
  const top = (await readdir(folder)).sort().join(',')
  if (top !== 'README.md,catalog,elekloader.lock.json,kit') throw new Error('vendor/elekloader holds only README.md, catalog/, elekloader.lock.json and kit/: ' + top)
  const bad: string[] = []
  const kitFiles = await names(kit)
  for (const path of kitFiles) if (lock.kit.files[path] !== sha(await readFile(resolve(kit, path)))) bad.push(path in lock.kit.files ? 'kit file changed: ' + path : 'kit file not in the lock: ' + path)
  for (const path of Object.keys(lock.kit.files)) if (!kitFiles.includes(path)) bad.push('kit file missing: ' + path)
  const raw = await readFile(resolve(dir, 'catalog.json'))
  if (sha(raw) !== lock.catalog.sha256) bad.push('catalog.json is not the one the lock pins')
  const catalog = parseCatalog(JSON.parse(raw.toString('utf8')))
  const pins = [...catalog.cores, ...catalog.mods], assets: [string, Buffer][] = [[ELEKLOADER_SITE + 'catalog.json', raw]]
  for (const pin of pins) {
    const data = await readFile(resolve(dir, pin.file)).catch(() => undefined)
    if (!data) bad.push('missing: ' + pin.file)
    else if (sha(data) !== pin.sha256) bad.push('not the pinned file: ' + pin.file)
    else assets.push([ELEKLOADER_SITE + pin.file, data])
  }
  for (const path of await names(dir)) if (path !== 'catalog.json' && !pins.some(pin => pin.file === path)) bad.push('not in the catalog: ' + path)
  if (bad.length) throw new Error('Vendored elekloader differs from its lock:\n' + bad.join('\n'))
  return { lock, catalog, assets }
}

const TYPES: Record<string, string> = { json: 'application/json', elemod: 'application/json' }

/** Serves the verified catalog in development and emits it beside the app in builds. */
export function elekloaderSite(root: string): Plugin {
  let assets: Promise<Map<string, Buffer>> | undefined
  const load = () => assets ??= readVendoredElekloader(root).then(result => new Map(result.assets))
  return {
    name: 'modwerk-elekloader-site',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = (request.url ?? '').split('?')[0].replace(/^\/+/, '')
        if (!path.startsWith(ELEKLOADER_SITE)) return next()
        const data = (await load()).get(path)
        if (!data) { response.statusCode = 404; response.end(); return }
        response.setHeader('Content-Type', TYPES[path.split('.').pop()!] ?? 'application/octet-stream')
        response.end(data)
      })
    },
    async generateBundle() {
      for (const [fileName, source] of await load()) this.emitFile({ type: 'asset', fileName, source })
    },
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { lock, catalog, assets } = await readVendoredElekloader(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
  console.log('Vendored elekloader kit ' + lock.kit.version + ' (protocol ' + lock.kit.protocol + ', ' + Object.keys(lock.kit.files).length + ' files) and catalog ' + catalog.revision.slice(0, 7) + ' (' + catalog.cores.length + ' cores, ' + catalog.mods.length + ' mods): ' + assets.length + ' site assets, as the lock pins.')
}
