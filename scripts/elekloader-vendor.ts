// SPDX-License-Identifier: GPL-3.0-or-later
// The vendored elekloader builder (vendor/elekloader) and its pinned Pyodide runtime.
// Verifies every pinned file offline and serves/emits the site assets the Digitakt/Digitone build page loads.
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

export const ELEKLOADER_SITE = 'elekloader/'
type Pinned = { machine: string; release: string; file: string; sha256: string }
type Upstream = { schemaVersion: number; commit: string; license: string; files: Record<string, string>; cores: Pinned[]; mods: (Pinned & { module: string })[]; pyodide: { npm: string; files: string[] } }
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const HEX = /^[a-f0-9]{64}$/

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

/** Throws when any vendored byte differs from its pin; -> the site assets as [path, bytes]. */
export async function readVendoredElekloader(root: string): Promise<{ upstream: Upstream; assets: [string, Buffer][] }> {
  const folder = resolve(root, 'vendor/elekloader')
  const upstream = JSON.parse(await readFile(resolve(folder, 'UPSTREAM.json'), 'utf8')) as Upstream
  if (upstream.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(upstream.commit) || upstream.license !== 'GPL-2.0-or-later') throw new Error('Invalid vendored elekloader record')
  const pinned = new Map(Object.entries(upstream.files))
  for (const item of [...upstream.cores, ...upstream.mods]) {
    if (!/^(core|shop)\/[a-z0-9.-]+\.elemod$/.test(item.file) || !HEX.test(item.sha256) || !['digitakt', 'digitone'].includes(item.machine) || !/^\d\.\d\d$/.test(item.release)) throw new Error('Invalid vendored elekloader entry: ' + item.file)
    pinned.set(item.file, item.sha256)
  }
  const present = (await walk(folder)).map(path => relative(folder, path)).filter(path => path !== 'UPSTREAM.json' && path !== 'README.md')
  const extra = present.filter(path => !pinned.has(path)), missing = [...pinned.keys()].filter(path => !present.includes(path))
  if (extra.length || missing.length) throw new Error('Vendored elekloader files differ from UPSTREAM.json: ' + [...extra.map(p => '+' + p), ...missing.map(p => '-' + p)].join(', '))
  const bytes = new Map<string, Buffer>()
  for (const [path, hash] of pinned) {
    const data = await readFile(resolve(folder, path))
    if (sha(data) !== hash) throw new Error('Vendored elekloader file changed: ' + path)
    bytes.set(path, data)
  }
  const pyodide = resolve(root, 'node_modules/pyodide')
  const installed = JSON.parse(await readFile(resolve(pyodide, 'package.json'), 'utf8')).version
  if ('pyodide@' + installed !== upstream.pyodide.npm) throw new Error('Installed Pyodide ' + installed + ' is not the pinned ' + upstream.pyodide.npm)
  const engine = { commit: upstream.commit, files: Object.fromEntries([...bytes].filter(([path]) => path.endsWith('.py')).map(([path, data]) => [path, data.toString('utf8')])) }
  const catalog = { commit: upstream.commit, cores: upstream.cores, mods: upstream.mods }
  const assets: [string, Buffer][] = [
    ...await Promise.all(upstream.pyodide.files.map(async name => [ELEKLOADER_SITE + 'pyodide/' + name, await readFile(resolve(pyodide, name))] as [string, Buffer])),
    [ELEKLOADER_SITE + 'engine.json', Buffer.from(JSON.stringify(engine))],
    [ELEKLOADER_SITE + 'catalog.json', Buffer.from(JSON.stringify(catalog))],
    ...[...upstream.cores, ...upstream.mods].map(item => [ELEKLOADER_SITE + item.file, bytes.get(item.file)!] as [string, Buffer]),
  ]
  return { upstream, assets }
}

const TYPES: Record<string, string> = { mjs: 'text/javascript', json: 'application/json', wasm: 'application/wasm', zip: 'application/zip', elemod: 'application/json' }

/** Serves the verified builder files in development and emits them beside the app in builds. */
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
  const { upstream, assets } = await readVendoredElekloader(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
  console.log('Vendored elekloader ' + upstream.commit.slice(0, 7) + ': ' + upstream.cores.length + ' cores, ' + upstream.mods.length + ' mods, ' + Object.keys(upstream.files).length + ' engine files and ' + assets.length + ' site assets verified.')
}
