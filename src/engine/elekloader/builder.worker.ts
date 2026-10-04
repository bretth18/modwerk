// SPDX-License-Identifier: GPL-3.0-or-later
// The vendored elekloader builder in a worker: Pyodide runs elekloader's own, unchanged code and web bridge
// (vendor/elekloader). Adapted from elekloader's web/worker.js by irpina (GPL-2.0-or-later): the worker
// keeps to this site, Pyodide loads only from it, and the owner's files stay in this tab's memory.
import type { loadPyodide as LoadPyodide, PyodideAPI } from 'pyodide'
import type { BuilderCatalog, BuilderRequest } from './protocol'

const SITE = self.location.origin
const sameSite = (url: string) => new URL(url, self.location.href).origin === SITE
const siteFetch = self.fetch.bind(self)
self.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input)
  return sameSite(url) ? siteFetch(input, init) : Promise.reject(new TypeError('Refused: ' + url + ' is not on this site.'))
}
const scope = self as unknown as Record<string, unknown>
for (const key of ['XMLHttpRequest', 'WebSocket', 'WebSocketStream', 'EventSource', 'WebTransport', 'RTCPeerConnection']) if (key in scope) scope[key] = undefined

type Bridge = { call(name: string, args: string, data?: Uint8Array, progress?: (line: string) => void): string }
let py: PyodideAPI | undefined, bridge: Bridge | undefined, base = ''

async function bytes(path: string) {
  const response = await fetch(new URL(path, base))
  if (!response.ok) throw new Error(path + ': ' + response.status)
  return new Uint8Array(await response.arrayBuffer())
}
async function sha256(data: Uint8Array) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>))].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
function call(name: string, args: unknown, data?: Uint8Array, progress?: (line: string) => void) {
  return JSON.parse(bridge!.call(name, JSON.stringify(args), data, progress))
}

async function init(siteBase: string) {
  if (bridge) return { commit: '', pyodide: py!.version }
  base = siteBase
  if (!sameSite(base)) throw new Error('The builder loads only from this site.')
  const index = new URL('pyodide/', base).href
  const { loadPyodide } = await import(/* @vite-ignore */ index + 'pyodide.mjs') as { loadPyodide: typeof LoadPyodide }
  py = await loadPyodide({ indexURL: index, packageBaseUrl: index, env: { HOME: '/work' } })
  const engine = JSON.parse(new TextDecoder().decode(await bytes('engine.json'))) as { commit: string; files: Record<string, string> }
  for (const [path, text] of Object.entries(engine.files)) {
    if (!/^[\w./-]+\.py$/.test(path) || path.includes('..')) throw new Error('Invalid builder file: ' + path)
    py.FS.mkdirTree('/elek/' + path.split('/').slice(0, -1).join('/'))
    py.FS.writeFile('/elek/' + path, text)
  }
  py.FS.mkdirTree('/work')
  py.runPython("import sys; sys.path.insert(0, '/elek')")
  bridge = py.pyimport('bridge') as unknown as Bridge
  const catalog = JSON.parse(new TextDecoder().decode(await bytes('catalog.json'))) as BuilderCatalog
  for (const core of catalog.cores) {
    const raw = await bytes(core.file)
    if (await sha256(raw) !== core.sha256) throw new Error(core.file + ' is not the pinned core.')
    call('add_core', { name: core.file.split('/').pop(), sha256: core.sha256 }, raw)
  }
  return { commit: engine.commit, pyodide: py.version, info: call('info', {}) }
}

async function handle(request: BuilderRequest, report: (line: string) => void) {
  if (request.cmd === 'init') return init(request.base)
  if (!bridge || !py) throw new Error('The builder is not loaded.')
  switch (request.cmd) {
    case 'setStock': return call('set_stock', { name: request.name }, new Uint8Array(request.data))
    case 'addMod': {
      const raw = await bytes(request.file)
      if (await sha256(raw) !== request.sha256) throw new Error(request.file + ' is not the pinned module file.')
      return call('add_mod', { name: request.file.split('/').pop(), sha256: request.sha256 }, raw)
    }
    case 'mods': return call('mods', {})
    case 'tick': return call('tick', { enabled: request.enabled, path: request.path })
    case 'check': return call('check', { enabled: request.enabled })
    case 'version': return call('version', { version: request.version, enabled: request.enabled })
    case 'build': {
      const result = call('build', { enabled: request.enabled, version: request.version, name: request.name }, undefined, report)
      if (result.ok) for (const file of result.files) file.data = py.FS.readFile(file.path).buffer
      return result
    }
  }
}

self.onmessage = async (event: MessageEvent<BuilderRequest & { id: number }>) => {
  const { id } = event.data
  try {
    const result = await handle(event.data, line => self.postMessage({ id, log: line }))
    const transfer = (result as { files?: { data?: ArrayBuffer }[] })?.files?.map(file => file.data).filter((data): data is ArrayBuffer => data instanceof ArrayBuffer) ?? []
    self.postMessage({ id, ok: true, result }, { transfer })
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}
