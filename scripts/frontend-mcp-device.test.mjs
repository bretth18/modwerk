import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, lstat, readdir, mkdir, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { createFrontendTools } from './frontend-mcp.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const base = 'a'.repeat(64), active = 'b'.repeat(64), candidate = 'c'.repeat(64)
const savedSnapshots = () => [0, 1].map(slot => {
  const data = new Uint8Array(513).fill(slot + 17)
  data.set([0x4d, 0x57, 0x53, 0x54])
  return { status: 'ready', slot, token: slot + 1, length: data.length,
    sha256: createHash('sha256').update(data).digest('hex'), fileBase: Buffer.from(data.subarray(20, 52)).toString('hex'), data }
})
let frontend, manifest, tapehead

beforeAll(async () => {
  // Keep catalogue planning, inventory mapping and package validation real; only
  // the device's observable states and mutation responses are simulated below.
  const bundled = await build({ root, configFile: false, logLevel: 'silent', define: {
    'import.meta.env.VITE_COMMUNITY_API_URL': JSON.stringify('http://127.0.0.1:8788/api'),
    'import.meta.env.DEV': 'false', 'import.meta.env.BASE_URL': JSON.stringify('/'),
  }, build: { ssr: join(root, 'scripts/frontend-mcp-bridge.ts'), write: false, minify: false, sourcemap: false } })
  const source = bundled.output.find(entry => entry.type === 'chunk' && entry.isEntry)?.code
  frontend = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
  manifest = JSON.parse(await readFile(join(root, 'src/engine/assets/octatrack-module-packages.json'), 'utf8'))
  tapehead = manifest.packages.find(entry => entry.id === 'tapehead')
}, 30000)

class FakeLink {
  state = { status: 'ready', identity: { base, canSubmit: true }, active }
  modules = [{ module: '873d83cc', handle: 27, layout: 1 }]
  diagnostics = { state: 0, failed: 0, saved: 1 }
  finalReading = { state: 2, failed: 0, saved: 1 }
  listeners = new Set()
  updates = []
  keeps = 0
  undos = 0
  failHealthOnce = false
  previous = undefined

  getState = () => this.state
  inventory = async () => structuredClone(this.modules)
  missing = async () => []
  health = async () => {
    if (this.failHealthOnce) { this.failHealthOnce = false; throw new Error('post-undo status unavailable') }
    return this.diagnostics && structuredClone(this.diagnostics)
  }
  liveLoad = async () => ({ ticks: 120, frames: 1000, cpu: 123, tracks1to4: 234, tracks5to8: 345, peak1to4: 456, peak5to8: 567 })
  savedBackup = async () => savedSnapshots()
  subscribeDiagnostics = listener => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  selftest = async () => {
    if (this.finalReading) for (const listener of this.listeners) listener({ event: 'selftest', reading: structuredClone(this.finalReading) })
    // This deliberately claims success even with no/failing evidence. The MCP
    // must independently require an actual final passed diagnostic record.
    return null
  }
  update = async (name, changes, stressTest) => {
    this.updates.push({ name, changes })
    this.previous = { modules: structuredClone(this.modules), state: this.state }
    for (const change of changes) {
      const module = new DataView(change.data.buffer, change.data.byteOffset, change.data.byteLength).getUint32(28).toString(16).padStart(8, '0')
      this.modules = this.modules.filter(item => item.module !== module)
      if (change.data.length > 32) this.modules.push({ module, handle: 30, layout: 1 })
    }
    this.state = { ...this.state, status: 'testing', active: candidate }
    await stressTest()
    this.state = { ...this.state, status: 'trial', tested: true }
  }
  undo = async () => {
    this.undos++
    this.modules = structuredClone(this.previous.modules)
    this.state = { ...this.previous.state, status: 'ready', notice: { tone: 'success', text: 'Undone.' } }
  }
  keep = async () => {
    this.keeps++
    this.state = { ...this.state, status: 'ready', notice: { tone: 'success', text: 'Kept.' } }
  }
}

describe('frontend MCP reviewed device transactions', () => {
  let folder, service, link, clock
  const requested = ['everb', 'tapehead']
  const review = () => service.call('device_review', { moduleIds: requested })
  const trial = async () => service.call('device_trial', { review: (await review()).review })

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'modwerk-mcp-device-test-'))
    link = new FakeLink(); clock = 1000
    service = await createFrontendTools({ dataDir: folder, deviceSocket: 'test-only', allowDeviceWrites: true }, frontend, {
      openLink: async () => link, now: () => clock,
    })
  })
  afterEach(async () => { await service?.close(); await rm(folder, { recursive: true, force: true }) })

  it('reads cached live load without self-test, review, trial or device-write permission', async () => {
    await service.close()
    service = await createFrontendTools({ dataDir: folder, deviceSocket: 'test-only' }, frontend, { openLink: async () => link })
    const result = await service.call('device_load')
    expect(result).toMatchObject({ base, supported: true, reading: { cpu: 123, tracks1to4: 234, tracks5to8: 345 } })
    expect(service.tools.find(tool => tool.name === 'device_load').annotations.readOnlyHint).toBe(true)
    expect(link.updates).toHaveLength(0); expect(link.keeps).toBe(0); expect(link.undos).toBe(0)
    link.liveLoad = async () => undefined
    expect(await service.call('device_load')).toEqual({ base, supported: false, reading: null })
    link.liveLoad = async () => { link.state = { ...link.state, identity: { ...link.state.identity, base: 'd'.repeat(64) } }; return {} }
    await expect(service.call('device_load')).rejects.toThrow('changed during')
  })
  it('saves verified files privately without device-write permission and returns only a metadata receipt', async () => {
    await service.close()
    service = await createFrontendTools({ dataDir: folder, deviceSocket: 'test-only' }, frontend, { openLink: async () => link })
    await expect(service.call('device_saved_backup', { path: '/anywhere' })).rejects.toThrow('Unexpected')
    const receipt = await service.call('device_saved_backup')
    expect(receipt).toMatchObject({ base, active, supported: true, complete: true, recoveryVerified: false, cardWrites: false })
    expect(receipt.directory.startsWith(folder + '/saved-sets-')).toBe(true)
    expect((await lstat(receipt.directory)).mode & 0o077).toBe(0)
    for (const [slot, record] of receipt.files.entries()) {
      expect(await readFile(record.path)).toEqual(Buffer.from(savedSnapshots()[slot].data))
      expect((await lstat(record.path)).mode & 0o077).toBe(0)
      expect(record).not.toHaveProperty('data')
    }
    expect((await lstat(join(receipt.directory, 'receipt.json'))).mode & 0o077).toBe(0)
    expect(JSON.parse(await readFile(join(receipt.directory, 'receipt.json'), 'utf8'))).toEqual(receipt)
    expect(service.tools.find(tool => tool.name === 'device_saved_backup').annotations.destructiveHint).toBe(false)
    expect(link.updates).toHaveLength(0); expect(link.keeps).toBe(0); expect(link.undos).toBe(0)
  })
  it('does not infer absent files from an old base or a read failure', async () => {
    link.savedBackup = async () => undefined
    expect(await service.call('device_saved_backup')).toMatchObject({ supported: false, complete: false, recoveryVerified: false, files: [] })
    expect((await readdir(folder)).filter(name => name.startsWith('saved-sets-'))).toHaveLength(0)
    link.savedBackup = async () => [{ status: 'read-failed', slot: 0, token: 1, length: 0, sha256: '0'.repeat(64), fileBase: '0'.repeat(64) }, savedSnapshots()[1]]
    const receipt = await service.call('device_saved_backup')
    expect(receipt.complete).toBe(false)
    expect(receipt.files[0]).toEqual({ slot: 0, name: 'MODWERK0.SET', status: 'read-failed', absent: false })
    expect(receipt.files[1].status).toBe('ready')
    expect(await readdir(receipt.directory)).toEqual(['MODWERK1.SET', 'receipt.json'])
  })
  it.each(['identity', 'hash', 'slot', 'size', 'base-header'])('rejects altered %s before creating private backup files', async field => {
    link.savedBackup = async () => {
      const snapshots = savedSnapshots()
      if (field === 'identity') link.state = { ...link.state, active: 'd'.repeat(64) }
      if (field === 'hash') snapshots[0].data[60] ^= 1
      if (field === 'slot') snapshots[0].slot = 1
      if (field === 'size') snapshots[0].length++
      if (field === 'base-header') snapshots[0].fileBase = '0'.repeat(64)
      return snapshots
    }
    await expect(service.call('device_saved_backup')).rejects.toThrow()
    expect((await readdir(folder)).filter(name => name.startsWith('saved-sets-'))).toHaveLength(0)
  })
  it('refuses a replacement workspace even when it has private permissions', async () => {
    const moved = folder + '-owned-original'
    await rename(folder, moved); await mkdir(folder, { mode: 0o700 })
    try {
      await expect(service.call('device_saved_backup')).rejects.toThrow('workspace changed')
      expect(await readdir(folder)).toEqual([])
      expect(await readdir(moved)).toEqual(['.mcp-lock'])
    } finally { await rm(folder, { recursive: true }); await rename(moved, folder) }
  })

  it('preserves the legacy E-Verb baseline and sends only the verified TapeHead addition with its removal Undo', async () => {
    await expect(service.call('device_review', { moduleIds: ['tapehead'] })).rejects.toThrow('Preserve')
    expect(link.updates).toHaveLength(0)
    const plan = await review()
    expect(plan.changes).toEqual([{ module: 'TapeHead', sha256: tapehead.sha256, undoAvailable: true }])
    const result = await service.call('device_trial', { review: plan.review })
    expect(link.updates).toHaveLength(1)
    const changes = link.updates[0].changes
    expect(changes).toHaveLength(1)
    expect(changes[0].data).toEqual(new Uint8Array(await readFile(join(root, 'public', tapehead.path))))
    expect(changes[0].undo).toHaveLength(32)
    expect(new DataView(changes[0].undo.buffer).getUint32(28)).toBe(Number.parseInt(tapehead.module, 16))
    expect(link.keeps).toBe(0)
    const undone = await service.call('device_undo', { trial: result.trial })
    expect(undone.inventory.moduleIds).toEqual(['everb'])
    expect(undone.state.active).toBe(active)
    expect(link.undos).toBe(1)
  })

  it.each(['base', 'active', 'inventory'])('rejects a stale %s review before any mutation', async field => {
    const plan = await review()
    if (field === 'base') link.state = { ...link.state, identity: { ...link.state.identity, base: 'd'.repeat(64) } }
    if (field === 'active') link.state = { ...link.state, active: 'd'.repeat(64) }
    if (field === 'inventory') link.modules.push({ module: '3cbedc9c', handle: 31, layout: 1 })
    await expect(service.call('device_trial', { review: plan.review })).rejects.toThrow('changed after review')
    expect(link.updates).toHaveLength(0)
    expect(link.undos).toBe(0)
    expect(link.keeps).toBe(0)
    await expect(service.call('device_trial', { review: plan.review })).rejects.toThrow('expired')
  })

  it('expires reviewed plans using the injected clock and sends nothing', async () => {
    const plan = await review()
    clock += 60001
    await expect(service.call('device_trial', { review: plan.review })).rejects.toThrow('expired')
    expect(link.updates).toHaveLength(0)
    expect(link.undos).toBe(0)
    expect(link.keeps).toBe(0)
  })

  it('refuses a multiple-change trial before the site link could accept intermediate changes', async () => {
    const plan = await service.call('device_review', { moduleIds: ['everb', 'tapehead', 'airwindows-chorus'] })
    expect(plan.changes).toHaveLength(2)
    await expect(service.call('device_trial', { review: plan.review })).rejects.toThrow(/one|single|multiple/i)
    expect(link.updates).toHaveLength(0)
    expect(link.keeps).toBe(0)
    expect(link.undos).toBe(0)
    expect((await service.call('device_status')).inventory.moduleIds).toEqual(['everb'])
  })

  it('requires a self-test status endpoint before even preparing a device trial', async () => {
    link.diagnostics = undefined
    await expect(review()).rejects.toThrow('self-test status')
    expect(link.updates).toHaveLength(0)
  })

  it.each([
    ['missing', undefined], ['still running', { state: 1, failed: 0 }], ['failed', { state: 2, failed: 1 }],
  ])('undoes a claimed successful trial with %s self-test evidence', async (_, reading) => {
    link.finalReading = reading
    await expect(trial()).rejects.toThrow('passed physical self-test')
    expect(link.updates).toHaveLength(1)
    expect(link.undos).toBe(1)
    expect(link.keeps).toBe(0)
    expect(link.state.status).toBe('ready')
    expect((await service.call('device_status')).inventory.moduleIds).toEqual(['everb'])
    expect((await review()).review).toBeTypeOf('string')
  })

  it('consumes the Undo token after restoration even when the completion status read fails', async () => {
    const result = await trial()
    link.failHealthOnce = true
    await service.call('device_undo', { trial: result.trial }).catch(error => {
      expect(error.message).toContain('post-undo status unavailable')
    })
    expect(link.undos).toBe(1)
    expect(link.state.status).toBe('ready')
    expect((await service.call('device_status')).inventory.moduleIds).toEqual(['everb'])
    await expect(service.call('device_undo', { trial: result.trial })).rejects.toThrow('matching authorized')
    expect((await review()).review).toBeTypeOf('string')
    expect(link.undos).toBe(1)
  })

  it('rejects the wrong Keep token and never accepts a trial automatically', async () => {
    const result = await trial()
    await expect(service.call('device_keep', { trial: 'not-the-issued-token' })).rejects.toThrow('matching authorized')
    expect(link.keeps).toBe(0)
    expect(link.state.status).toBe('trial')
    await service.call('device_undo', { trial: result.trial })
    expect(link.undos).toBe(1)
  })

  it('accepts only an explicitly requested matching Keep token, once', async () => {
    const result = await trial()
    const kept = await service.call('device_keep', { trial: result.trial })
    expect(kept.kept).toBe(true)
    expect(kept.inventory.moduleIds).toEqual(requested)
    expect(link.keeps).toBe(1)
    await expect(service.call('device_keep', { trial: result.trial })).rejects.toThrow('matching authorized')
    expect(link.keeps).toBe(1)
  })
  it('refuses Keep over foreign saved files while leaving the exact trial Undo available', async () => {
    link.diagnostics = { state: 0, failed: 0, saved: 4 }
    const result = await trial()
    await expect(service.call('device_saved_backup')).rejects.toThrow('Finish the current trial')
    await expect(service.call('device_keep', { trial: result.trial })).rejects.toThrow('saved files from another base')
    expect(link.keeps).toBe(0); expect(link.state.status).toBe('trial')
    await service.call('device_undo', { trial: result.trial })
    expect(link.undos).toBe(1); expect(link.state.active).toBe(active)
  })

  it('requires startup write authorization even with a valid reviewed plan', async () => {
    await service.close()
    service = await createFrontendTools({ dataDir: folder, deviceSocket: 'test-only' }, frontend, {
      openLink: async () => link, now: () => clock,
    })
    const plan = await review()
    await expect(service.call('device_trial', { review: plan.review })).rejects.toThrow('--allow-device-writes')
    await expect(service.call('device_keep', { trial: 'anything' })).rejects.toThrow('matching authorized')
    await expect(service.call('device_undo', { trial: 'anything' })).rejects.toThrow('matching authorized')
    expect(link.updates).toHaveLength(0)
    expect(link.keeps).toBe(0)
    expect(link.undos).toBe(0)
  })
})
