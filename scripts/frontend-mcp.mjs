// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile, mkdir, rename, lstat, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'
import { build } from 'vite'
import { Bench, device, enumerate } from './usb-bench.mjs'
import { buildAndSave } from './firmware-download.mjs'
import { assertMcpPrivateHost } from './frontend-mcp-private-host.mjs'
import { saveSavedBackup } from './frontend-mcp-saved-backup.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
let activeWorkspace = false
const hash = data => createHash('sha256').update(data).digest('hex')
/** Frontend errors can contain a megabyte data-URL stack. Log only bounded
 * messages; objects and error causes may contain account or transport data. */
export function formatMcpLog(...args) {
  return args.slice(0, 8).map(value => {
    const message = value instanceof Error ? value.name + ': ' + value.message
      : typeof value === 'string' ? value : value !== null && typeof value === 'object' ? '[object]' : String(value)
    return message.replace(/data:[^\s)]*/g, '[data URL]').slice(0, 1024)
  }).join(' ').slice(0, 2048)
}
const object = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error('Unexpected arguments.')
  return value
}
const ids = value => {
  if (!Array.isArray(value) || value.length > 128 || value.some(id => typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) || new Set(value).size !== value.length) throw new Error('Use unique catalogue module IDs.')
  return value
}
const schema = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false })
const string = { type: 'string' }, strings = { type: 'array', items: string, maxItems: 128, uniqueItems: true }
const tool = (name, description, properties = {}, required = [], writes = false) => ({ name, description, inputSchema: schema(properties, required), annotations: { readOnlyHint: !writes, destructiveHint: writes, openWorldHint: name.startsWith('api_') || name.startsWith('device_'), idempotentHint: !writes } })
const TOOLS = [
  tool('site_features', 'Describe supported frontend operations and the limits of API, DOM and hardware evidence.'),
  tool('site_catalogue', 'List instruments and modules from the actual site catalogue, including current USB package availability.', { machine: string, query: string, category: string, beta: { type: 'boolean' } }),
  tool('site_module', 'Read module controls, usage, licence, evidence and compatibility.', { machine: string, id: string }, ['id']),
  tool('site_selection', 'Validate a card selection using the site rules, or prepare a USB selection and exact Undo packages without device writes.', { machine: string, moduleIds: strings, keepStockFx2: { type: 'boolean' }, usb: { type: 'boolean' }, beta: { type: 'boolean' }, current: { type: 'object' }, capabilities: { type: 'object' } }, ['moduleIds']),
  tool('set_list', 'Read this MCP workspace’s private module sets; browser and other developers’ workspaces are separate.'),
  tool('set_save', 'Create or update a local module set using the frontend validation/current version rules.', { id: string, name: string, machine: string, moduleIds: strings, keepStockFx2: { type: 'boolean' }, usbAudio: { type: 'object' }, removedStockFx: strings }, ['name', 'moduleIds'], true),
  tool('set_delete', 'Delete one set from this isolated MCP workspace.', { id: string }, ['id'], true),
  tool('set_export', 'Return a metadata-only JSON backup of this workspace’s sets.'),
  tool('set_import', 'Validate and import metadata-only configuration backups, selecting current catalogue versions.', { configurations: { type: 'array', items: { type: 'object' }, maxItems: 100 } }, ['configurations'], true),
  tool('api_request', 'Call a supported frontend community API route. Uses startup-selected normal member/developer credentials; server permissions still apply. Writes need --allow-api-writes and confirm=true.', { path: string, method: { enum: ['GET', 'POST', 'PATCH', 'DELETE'] }, body: { type: 'object' }, confirm: { type: 'boolean' } }, ['path'], true),
  tool('firmware_download', 'Build from exact deployed public inputs using local private stock, save files privately and return only a hash/identity receipt. Never sends firmware to MCP.', { request: { type: 'object' } }, ['request'], true),
  tool('device_status', 'Read the connected base identity, inventory, missing modules and bounded diagnostic status through the real site USB client.'),
  tool('device_load', 'Read one cached CPU/DSP meter snapshot through the real frontend client. Read-only; never runs a self-test. Older bases report unsupported.'),
  { ...tool('device_saved_backup', 'Read only /MODWERK0.SET and /MODWERK1.SET through the frontend client, save verified bytes in the startup-selected private workspace and return only a metadata receipt. No card writes, memory access, arbitrary paths or recovery qualification. Older bases report unsupported.'),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false } },
  tool('device_review', 'Review a requested set against exact connected base, active digest and verified packages. Returns a short-lived plan; no device changes.', { moduleIds: strings }, ['moduleIds']),
  tool('device_trial', 'Execute a reviewed set through the real frontend link and self-test. A trial requires --allow-device-writes; never accepts automatically.', { review: string }, ['review'], true),
  tool('device_keep', 'Explicitly accept the current successful self-tested trial and save it on the card. Requires --allow-device-writes.', { trial: string }, ['trial'], true),
  tool('device_undo', 'Undo the current trial and restore its exact reviewed previous packages.', { trial: string }, ['trial'], true),
]

export function validateApiPath(path) {
  if (typeof path !== 'string' || path.length > 2000 || !path.startsWith('/') || /[\\#%\s]/.test(path) || [...path].some(char => char.charCodeAt(0) < 32) || path.includes('..') || path.startsWith('//')) throw new Error('Invalid frontend API route.')
  const pathname = path.split('?')[0]
  if (!['/auth/session', '/auth/build-access', '/auth/base-install-prompt'].includes(pathname) && /\/(?:auth|keys|secrets|tokens|credentials)(?:\/|$)/.test(pathname)) throw new Error('Authentication and secret management use their existing sign-in workflows.')
  if (!/^\/(?:auth\/(?:session|build-access|base-install-prompt)|catalog|community\/(?:summary|online)|forum(?:\/[^?]*)?|modules(?:\/[^?]*)?|issues(?:\/[^?]*)?|working-reports|notifications(?:\/[^?]*)?|announcements(?:\/[^?]*)?|account(?:\/[^?]*)?|developer(?:\/[^?]*)?|admin(?:\/[^?]*)?)$/.test(pathname)) throw new Error('This route is outside the frontend API surface.')
  return path
}

export async function createFrontendTools(options, injected, dependencies = {}) {
  assertMcpPrivateHost()
  const { root = ROOT, dataDir, apiBase = 'http://127.0.0.1:8788/api', site = 'https://modwerk.app/' } = options
  if (!dataDir) throw new Error('--data-dir is required; choose a private MCP workspace.')
  const api = new URL(apiBase), deployment = new URL(site)
  if (api.username || api.password || api.search || api.hash || api.pathname !== '/api' || !(api.protocol === 'https:' || api.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(api.hostname))) throw new Error('Use HTTPS or a localhost API ending in /api.')
  if (deployment.username || deployment.password || deployment.search || deployment.hash || !(deployment.protocol === 'https:' || deployment.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(deployment.hostname))) throw new Error('Invalid deployment URL.')
  await mkdir(dataDir, { recursive: true, mode: 0o700 })
  const directory = await lstat(dataDir)
  if (!directory.isDirectory() || directory.isSymbolicLink() || directory.mode & 0o077) throw new Error('Use a private directory (mode 0700), not a symlink.')
  const file = join(dataDir, 'sets.json')
  let sets = []
  try {
    const info = await lstat(file)
    if (!info.isFile() || info.isSymbolicLink() || info.size > 256 * 1024 || info.mode & 0o077) throw new Error('The set file must be private regular JSON (0600), not a symlink.')
    sets = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  let credentials
  if (options.sessionFile) {
    const info = await lstat(options.sessionFile)
    if (!info.isFile() || info.isSymbolicLink() || info.size > 4096 || info.mode & 0o077) throw new Error('Session credentials must be a private regular file (mode 0600).')
    credentials = object(JSON.parse(await readFile(options.sessionFile, 'utf8')), ['session', 'developer'])
    for (const value of Object.values(credentials)) if (typeof value !== 'string' || value.length > 600) throw new Error('Invalid session credentials.')
  }
  // The frontend auth helper uses process-global storage. One workspace per process
  // and an exclusive directory lease prevent credential mixing and lost set writes.
  if (activeWorkspace) throw new Error('Use a separate MCP process for each workspace.')
  const lease = join(dataDir, '.mcp-lock')
  activeWorkspace = true
  try { await mkdir(lease, { mode: 0o700 }) } catch (error) { activeWorkspace = false; if (error.code === 'EEXIST') throw new Error('This MCP workspace is already locked. Check its owner PID before recovering a stale lock.', { cause: error }); throw error }
  try {
  await writeFile(join(lease, 'owner.json'), JSON.stringify({ pid: process.pid, started: new Date().toISOString() }), { mode: 0o600, flag: 'wx' })
  let frontend = injected
  if (!frontend) {
    const bridge = join(ROOT, 'scripts/frontend-mcp-bridge.ts')
    const bundled = await build({ root, configFile: false, logLevel: 'silent', plugins: [{ name: 'mcp-candidate-source', resolveId(id, importer) { if (importer === bridge && id.startsWith('../src/')) return resolve(root, id.slice(3)) } }], define: { 'import.meta.env.VITE_COMMUNITY_API_URL': JSON.stringify(api.href), 'import.meta.env.DEV': 'false', 'import.meta.env.BASE_URL': JSON.stringify('/') }, build: { ssr: bridge, write: false, minify: false, sourcemap: false } })
    const source = bundled.output.find(entry => entry.type === 'chunk' && entry.isEntry)?.code
    if (!source) throw new Error('Could not load the frontend testing bridge.')
    frontend = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
  }
  if (!Array.isArray(sets) || sets.length > 100) throw new Error('The local set file is invalid.')
  sets = sets.map(frontend.validateConfiguration)
  const save = async values => {
    const temporary = file + '.' + randomUUID()
    try { await writeFile(temporary, JSON.stringify(values, null, 2), { mode: 0o600, flag: 'wx' }); await rename(temporary, file); sets = values }
    finally { await rm(temporary, { force: true }) }
  }
  const manifest = JSON.parse(await readFile(join(root, 'src/engine/assets/octatrack-module-packages.json'), 'utf8'))
  const catalogue = frontend.createRuntimeCatalogue(manifest)
  const load = async entry => {
    if (!/^octatrack-modules\/[a-z0-9-]+\/[a-zA-Z0-9.-]+\.mwrm$/.test(entry.path)) throw new Error('Unexpected module asset path.')
    const bytes = new Uint8Array(await readFile(join(root, 'public', entry.path)))
    if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw new Error('The local site package differs from its manifest.')
    return bytes
  }
  const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) } }
  globalThis.localStorage = storage(); globalThis.sessionStorage = storage()
  if (credentials) {
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value !== 'string' || value.length > 600) throw new Error('Invalid session credentials.')
      globalThis.localStorage.setItem((key === 'session' ? 'octamod.community.session:' : 'modwerk.developer.session:') + api.href, value)
    }
  }
  let bench, link, release, trial, closed = false
  const clock = dependencies.now ?? Date.now
  const reviews = new Map()
  async function connected() {
    if (!options.deviceSocket) throw new Error('Device tools require an explicitly selected --device-socket.')
    if (link && ['idle', 'disconnected', 'unavailable', 'error'].includes(link.getState().status)) {
      release?.(); bench?.socket.destroy(); link = undefined; release = undefined; bench = undefined; trial = undefined; reviews.clear()
    }
    if (!link) {
      try {
      if (dependencies.openLink) link = await dependencies.openLink()
      else {
      bench = new Bench(options.deviceSocket, { timeoutMs: 10000 }); await bench.ready()
      // A timed-out reply cannot be associated safely with a later request.
      const command = bench.command.bind(bench)
      bench.command = async (...args) => { try { return await command(...args) } catch (error) { bench.socket.destroy(); throw error } }
      const unit = Object.assign(device(bench), { configuration: await enumerate(bench, true), opened: false,
        async open() { this.opened = true }, async close() { this.opened = false }, async selectConfiguration() {}, async claimInterface() {}, async releaseInterface() {} })
      const listeners = new Set()
      const usb = { async getDevices() { return [] }, async requestDevice() { return unit }, addEventListener(type, listener) { if (type === 'disconnect') listeners.add(listener) }, removeEventListener(type, listener) { if (type === 'disconnect') listeners.delete(listener) } }
      bench.socket.on('error', () => { for (const listener of listeners) listener({ device: unit }) })
      bench.socket.on('close', () => { for (const listener of listeners) listener({ device: unit }) })
      link = new frontend.OctatrackLink(usb, undefined, 3000, frontend.tabLocks()); release = link.start(); await link.connect()
      }
      } catch (error) { release?.(); bench?.socket.destroy(); link = undefined; release = undefined; bench = undefined; throw error }
    }
    if (link.getState().status !== 'ready' && !(trial && link.getState().status === 'trial')) throw new Error('Octatrack is not ready: ' + link.getState().status)
    return link
  }
  async function snapshot() {
    const unit = await connected(), kit = frontend.moduleSetKit(unit)
    if (unit.getState().status === 'trial') return { state: unit.getState(), before: trial?.before, trial: trial?.id }
    const state = unit.getState()
    if (!/^[0-9a-f]{64}$/.test(state.identity?.base ?? '') || !/^[0-9a-f]{64}$/.test(state.active ?? '')) throw new Error('The device did not provide a verified base and active identity.')
    const inventory = await kit.readInventory(), missing = await unit.missing(), diagnostics = await unit.health(), after = unit.getState()
    if (after.status !== 'ready' || after.identity?.base !== state.identity.base || after.active !== state.active) throw new Error('The device changed while reading; reconnect and review again.')
    return { state: after, inventory, capabilities: after.identity.capabilities, missing, diagnostics }
  }
  const selection = async args => {
    const selected = ids(args.moduleIds), machine = args.machine ?? 'octatrack'
    if (machine !== 'octatrack') { if (!frontend.isDigiDevice(machine)) throw new Error('This machine has no supported builder.'); frontend.resolveDigiSelection(machine, selected); return frontend.estimateCombination(machine, selected) }
    frontend.resolveSelection(selected)
    if (!args.usb) return { availability: frontend.moduleAvailabilityError(selected, !!args.beta), conflicts: frontend.selectionConflicts(selected, args.keepStockFx2 ?? false) }
    const target = { name: 'MCP test set', moduleIds: selected, removedStockFx: [] }, current = args.current ?? { moduleIds: [], removedStockFx: [] }
    ids(current.moduleIds); ids(current.removedStockFx)
    const prepared = await catalogue.prepare(target, current, load, args.capabilities)
    return { review: catalogue.review(target, current, args.capabilities), changes: prepared.changes.map(change => ({ module: change.module, bytes: change.data.length, sha256: hash(change.data), undoSha256: change.undo && hash(change.undo) })) }
  }
  const handlers = {
    site_features: async () => ({ beta: true, tools: TOOLS.map(item => item.name), coverage: ['instrument/module catalogue, search and module guides', 'card compatibility and USB package preflight/Undo', 'isolated set CRUD/import/export/current versions', 'community API with normal permissions', 'saved public firmware download receipts', 'real site USB review/trial/self-test/Keep/Undo', 'cached live load and fixed saved-module-file backup receipts'], limits: ['Domain/API tests do not measure CSS pixels or audible output.', 'OAuth/browser sign-in and upload file selection use their separate existing workflows.', 'No raw memory, key injection, whole-OS flash or automatic Keep.', 'Local sources and private workspace are distinct from a live signed-in browser.', 'A saved-module-file backup does not qualify recovery or permit Keep over foreign saved files.'] }),
    site_catalogue: async args => {
      const machine = args.machine ?? 'all', octa = frontend.availableModules(!!args.beta).map(module => ({ ...module, machine: 'octatrack', usb: catalogue.ids.includes(module.id) })), digi = frontend.digiModules.map(module => ({ ...module, name: module.title, description: module.summary, machine: module.device }))
      return { machines: frontend.machines, modules: [...octa, ...digi].filter(module => (machine === 'all' || module.machine === machine) && (!args.category || (module.libraryCategory ?? module.category) === args.category) && (!args.query || (module.name + ' ' + module.description).toLowerCase().includes(args.query.toLowerCase()))) }
    },
    site_module: async args => { if ((args.machine ?? 'octatrack') === 'octatrack') { frontend.resolveSelection(ids([args.id])); return frontend.documents[args.id] } const [module] = frontend.resolveDigiSelection(args.machine, ids([args.id])); return module },
    site_selection: selection,
    set_list: async () => ({ configurations: sets }),
    set_export: async () => ({ configurations: sets, firmwareIncluded: false }),
    set_save: async args => {
      if (sets.length >= 100 && !args.id) throw new Error('Limit of 100 local module sets.')
      const previous = args.id && sets.find(item => item.id === args.id)
      if (args.id && !previous) throw new Error('Unknown module set.')
      const item = frontend.newConfiguration(args.name, ids(args.moduleIds), args.keepStockFx2 ?? true, undefined, args.machine ?? 'octatrack', args.usbAudio)
      const value = frontend.validateConfiguration({ ...item, ...(previous ? { id: previous.id, createdAt: previous.createdAt } : {}), removedStockFx: args.removedStockFx })
      await save([...sets.filter(entry => entry.id !== value.id), value]); return value
    },
    set_delete: async args => { if (!sets.some(item => item.id === args.id)) throw new Error('Unknown module set.'); await save(sets.filter(item => item.id !== args.id)); return { deleted: args.id } },
    set_import: async args => { if (!Array.isArray(args.configurations) || args.configurations.length + sets.length > 100) throw new Error('Limit of 100 local module sets.'); const values = args.configurations.map(frontend.validateConfiguration); if (new Set(values.map(item => item.id)).size !== values.length) throw new Error('Duplicate module set IDs.'); await save([...sets.filter(item => !values.some(value => value.id === item.id)), ...values]); return { imported: values.length } },
    api_request: async args => {
      const path = validateApiPath(args.path), method = args.method ?? 'GET'
      if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method) || method === 'GET' && args.body) throw new Error('Invalid API request.')
      if (method !== 'GET' && (!options.allowApiWrites || args.confirm !== true)) throw new Error('API writes require --allow-api-writes and confirm=true.')
      if (args.body && JSON.stringify(args.body).length > 16384) throw new Error('API body exceeds 16 KiB.')
      const response = await frontend.apiFetch(path, { method, redirect: 'error', signal: AbortSignal.timeout(30000), ...(args.body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args.body) } : {}) })
      let text = '', bytes = 0
      const decoder = new TextDecoder()
      for await (const chunk of response.body ?? []) { bytes += chunk.length; if (bytes > 256 * 1024) { throw new Error('API response exceeds the MCP limit.') } text += decoder.decode(chunk, { stream: true }) }
      text += decoder.decode()
      let body; try { body = JSON.parse(text) } catch { throw new Error('API did not return JSON.') }
      return { status: response.status, body }
    },
    firmware_download: async args => { if (!options.stock) throw new Error('Choose private stock at startup with --stock.'); return buildAndSave(args.request, { stockPath: options.stock, outputDir: dataDir, site, root }) },
    device_status: snapshot,
    device_load: async () => {
      const unit = await connected(), before = unit.getState()
      if (before.status !== 'ready' || !/^[0-9a-f]{64}$/.test(before.identity?.base ?? '')) throw new Error('The Octatrack must be idle with a verified base identity.')
      const reading = await unit.liveLoad(), after = unit.getState()
      if (after.status !== 'ready' || after.identity?.base !== before.identity.base || after.active !== before.active) throw new Error('The device changed during the load read.')
      return { base: after.identity.base, supported: reading !== undefined, reading: reading ?? null }
    },
    device_saved_backup: async () => {
      if (trial) throw new Error('Finish the current trial before backing up saved files.')
      const before = await snapshot(), unit = await connected()
      const snapshots = await unit.savedBackup(), after = await snapshot()
      if (after.state.status !== 'ready' || after.state.identity.base !== before.state.identity.base || after.state.active !== before.state.active ||
          JSON.stringify(after.inventory) !== JSON.stringify(before.inventory) || after.diagnostics?.saved !== before.diagnostics?.saved)
        throw new Error('The device changed during the saved-file backup; no files were saved.')
      if (!snapshots) return { supported: false, complete: false, recoveryVerified: false, base: after.state.identity.base, files: [] }
      return saveSavedBackup(dataDir, { base: after.state.identity.base, active: after.state.active }, snapshots, directory)
    },
    device_review: async args => {
      if (trial) throw new Error('Finish the current trial first.')
      const before = await snapshot(), target = { name: 'MCP reviewed set', moduleIds: ids(args.moduleIds), removedStockFx: [] }
      if (!before.diagnostics) throw new Error('The device does not provide the required self-test status.')
      // Legacy INVENTORY gives a layout, not the exact installed package hash. Preserve existing
      // modules rather than pretending the latest site package is their exact rollback image.
      if (before.inventory.moduleIds.some(id => !target.moduleIds.includes(id))) throw new Error('This base cannot identify exact installed rollback packages. Preserve its existing modules in this test set.')
      const prepared = await catalogue.prepare(target, before.inventory, load, before.capabilities), review = randomUUID()
      for (const [id, item] of reviews) if (item.expires < clock()) reviews.delete(id)
      if (reviews.size >= 10) throw new Error('Finish or expire existing reviews first.')
      reviews.set(review, { before, target, prepared, expires: clock() + 60000 })
      return { review, expiresInSeconds: 60, base: before.state.identity.base, active: before.state.active, changes: prepared.changes.map(change => ({ module: change.module, sha256: hash(change.data), undoAvailable: !!change.undo })) }
    },
    device_trial: async args => {
      if (!options.allowDeviceWrites) throw new Error('Device writes require --allow-device-writes.')
      if (trial) throw new Error('Finish the current trial first.')
      const plan = reviews.get(args.review); reviews.delete(args.review)
      if (!plan || plan.expires < clock()) throw new Error('Review expired; review the connected device again.')
      const now = await snapshot()
      if (now.state.identity.base !== plan.before.state.identity.base || now.state.active !== plan.before.state.active || JSON.stringify(now.inventory) !== JSON.stringify(plan.before.inventory)) throw new Error('The device changed after review; nothing was sent.')
      if (!plan.prepared.changes.length) return { unchanged: true, state: now.state }
      // The frontend accepts intermediate changes in a multi-change sync. A
      // trial-only tool must never persist those changes as a hidden Keep.
      if (plan.prepared.changes.length > 1) throw new Error('Trial-only testing supports one change at a time; multiple changes would Keep intermediate packages.')
      if (plan.prepared.changes.some(change => !change.undo)) throw new Error('Exact Undo is unavailable; nothing was sent.')
      let selftest
      const unsubscribe = link.subscribeDiagnostics(event => { if (event.event === 'selftest') selftest = event.reading })
      try { await link.update(plan.prepared.name, plan.prepared.changes, () => link.selftest()) } finally { unsubscribe() }
      if (link.getState().status !== 'trial' || !link.getState().tested || selftest?.state !== 2 || selftest.failed) {
        if (link.getState().status === 'trial') await link.undo()
        throw new Error('Device trial did not provide a passed physical self-test: ' + (link.getState().notice?.text ?? link.getState().status))
      }
      trial = { id: randomUUID(), before: plan.before, base: now.state.identity.base, active: link.getState().active }
      return { trial: trial.id, state: link.getState() }
    },
    device_keep: async args => finish(args, true),
    device_undo: async args => finish(args, false),
  }
  async function finish(args, keep) {
    if (!options.allowDeviceWrites || !trial || args.trial !== trial.id) throw new Error('No matching authorized device trial.')
    if (link.getState().status !== 'trial' || link.getState().identity.base !== trial.base || link.getState().active !== trial.active) throw new Error('Trial identity changed; reconnect and recover.')
    if (keep && trial.before.diagnostics?.saved === 4) throw new Error('Keep would replace saved files from another base. Their backup and exact recovery must be verified first; Undo remains available.')
    const completed = trial
    if (keep) await link.keep(); else await link.undo()
    if (link.getState().status !== 'ready') throw new Error(link.getState().notice?.text ?? 'Device did not finish the trial.')
    // Mutation completion and a later status receipt are distinct. Never let a
    // failed receipt leave a reusable token for an already completed mutation.
    trial = undefined
    if (link.getState().notice?.tone === 'error') return { kept: keep, completed: true, warning: link.getState().notice.text }
    const result = await snapshot()
    if (!keep && !frontend.sameModules(result.inventory.moduleIds, completed.before.inventory.moduleIds)) throw new Error('Undo did not restore the reviewed inventory.')
    return { kept: keep, completed: true, ...result }
  }
  let running = false
  return {
    tools: TOOLS,
    async call(name, args = {}) {
      const definition = TOOLS.find(item => item.name === name)
      if (!definition) throw new Error('Unknown tool.')
      object(args, Object.keys(definition.inputSchema.properties))
      for (const key of definition.inputSchema.required) if (args[key] === undefined) throw new Error('Missing argument: ' + key)
      for (const [key, value] of Object.entries(args)) {
        const rule = definition.inputSchema.properties[key]
        if (rule.enum && !rule.enum.includes(value) || rule.type === 'boolean' && typeof value !== 'boolean' || rule.type === 'string' && (typeof value !== 'string' || value.length > 8000) || rule.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value)) || rule.type === 'array' && !Array.isArray(value)) throw new Error('Invalid argument: ' + key)
      }
      if (closed) throw new Error('The MCP workspace is closed.')
      if (running) throw new Error('Another frontend/device operation is running.')
      running = true
      try { return await handlers[name](args) } finally { running = false }
    },
    async close() { if (closed) return; closed = true; try { if (trial) { try { await link.undo() } catch { /* Unaccepted trials also recover through device timeout. */ } } release?.(); bench?.socket.destroy() } finally { activeWorkspace = false; await rm(lease, { recursive: true, force: true }) } },
  }
  } catch (error) { activeWorkspace = false; await rm(lease, { recursive: true, force: true }); throw error }
}

export function createProtocol(service) {
  let initialized = false
  return async message => {
    const id = message?.id
    const failure = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || Array.isArray(message)) return failure(-32600, 'Invalid request.')
    if (id === undefined) return undefined
    if (typeof id !== 'string' && typeof id !== 'number') return failure(-32600, 'Invalid request ID.')
    if (message.method === 'initialize') { initialized = true; return { jsonrpc: '2.0', id, result: { protocolVersion: '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'modwerk-frontend-beta', version: '0.1.0' }, instructions: 'Use site tools before device trials. No automatic Keep. Local state is isolated; live API permissions remain server-enforced.' } } }
    if (!initialized) return failure(-32002, 'Initialize first.')
    if (message.method === 'ping') return { jsonrpc: '2.0', id, result: {} }
    if (message.method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: service.tools } }
    if (message.method !== 'tools/call') return failure(-32601, 'Method not found.')
    try { const result = await service.call(message.params?.name, message.params?.arguments); return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: typeof result === 'object' && result !== null ? result : { value: result }, isError: false } } }
    catch (error) { return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: error.message }], isError: true } } }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const method of ['log', 'info', 'debug', 'warn', 'error']) console[method] = (...args) => process.stderr.write(formatMcpLog(...args) + '\n')
  try {
  const { values } = parseArgs({ options: { 'data-dir': { type: 'string' }, 'frontend-root': { type: 'string' }, 'api': { type: 'string' }, site: { type: 'string' }, 'session-file': { type: 'string' }, stock: { type: 'string' }, 'device-socket': { type: 'string' }, 'allow-api-writes': { type: 'boolean' }, 'allow-device-writes': { type: 'boolean' } } })
  const service = await createFrontendTools({ root: values['frontend-root'] && resolve(values['frontend-root']), dataDir: values['data-dir'] && resolve(values['data-dir']), apiBase: values.api, site: values.site, sessionFile: values['session-file'], stock: values.stock, deviceSocket: values['device-socket'], allowApiWrites: values['allow-api-writes'], allowDeviceWrites: values['allow-device-writes'] })
  const protocol = createProtocol(service), input = createInterface({ input: process.stdin, crlfDelay: Infinity })
  let queue = Promise.resolve()
  input.on('line', line => { queue = queue.then(async () => { let reply; try { if (Buffer.byteLength(line) > 64 * 1024) throw new Error('Message too large.'); reply = await protocol(JSON.parse(line)) } catch { reply = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON-RPC message.' } } } if (reply) process.stdout.write(JSON.stringify(reply) + '\n') }) })
  input.on('close', () => { void queue.finally(() => service.close()) })
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { input.close(); void queue.finally(() => service.close()).finally(() => process.exit(0)) })
  } catch (error) { process.stderr.write(formatMcpLog(error) + '\n'); process.exitCode = 1 }
}
