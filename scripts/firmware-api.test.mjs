// SPDX-License-Identifier: GPL-3.0-or-later
import { it, expect, vi } from 'vitest'
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { get } from 'node:http'
import { startFirmwareApi } from './firmware-api.mjs'
import { sha256 } from './firmware-build-manifest.mjs'

it('requires local authentication, saves through the API, and serves only unchanged generated downloads', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'modwerk-http-test-'))
  const path = join(folder, 'output.syx'), data = Buffer.from('private generated fixture')
  await writeFile(path, data)
  const build = vi.fn(async () => ({ files: [{ path, sha256: sha256(data), bytes: data.length }] }))
  const api = await startFirmwareApi({ stockPath: '/private/stock.syx', outputDir: folder, port: 0, build })
  try {
    expect(api.server.address().address).toBe('127.0.0.1')
    expect((await stat(api.credentialsPath)).mode & 0o777).toBe(0o600)
    const { token } = JSON.parse(await readFile(api.credentialsPath, 'utf8'))
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    expect((await fetch(api.url + '/health')).status).toBe(401)
    expect((await fetch(api.url + '/health', { headers: { ...headers, Origin: 'https://evil.example' } })).status).toBe(403)
    const badHostStatus = await new Promise((accept, reject) => {
      get(api.url + '/health', { headers: { ...headers, Host: 'evil.example' } }, response => { response.resume(); accept(response.statusCode) }).on('error', reject)
    })
    expect(badHostStatus).toBe(403)
    expect((await fetch(api.url + '/health', { headers })).status).toBe(200)
    const body = { machine: 'digitakt', os: '1.54', moduleIds: ['digimono'], version: 'D180', riskAccepted: true }
    expect((await fetch(api.url + '/build-download', { method: 'POST', headers, body: JSON.stringify({ ...body, stockPath: '/etc/passwd' }) })).status).toBe(400)
    expect(build).not.toHaveBeenCalled()
    expect((await fetch(api.url + '/build-download', { method: 'POST', headers, body: ' '.repeat(17000) })).status).toBe(400)
    const response = await fetch(api.url + '/build-download', { method: 'POST', headers, body: JSON.stringify(body) })
    expect(response.status).toBe(201)
    expect(build).toHaveBeenCalledWith(body, { stockPath: '/private/stock.syx', outputDir: folder, site: 'https://modwerk.app/' })
    const receipt = await response.json(), download = receipt.files[0].url
    expect((await fetch(download)).status).toBe(401)
    const saved = await fetch(download, { headers })
    expect(saved.headers.get('X-Firmware-SHA256')).toBe(sha256(data))
    expect(Buffer.from(await saved.arrayBuffer())).toEqual(data)
    await writeFile(path, 'modified later')
    expect((await fetch(download, { headers })).status).toBe(409)
    expect((await fetch(api.url + '/downloads/00000000-0000-0000-0000-000000000000/0', { headers })).status).toBe(404)
  } finally { await api.close(); await rm(folder, { recursive: true, force: true }) }
  await expect(stat(api.credentialsPath)).rejects.toThrow()
})

it('rejects concurrent builds and releases the busy state after a failed build', async () => {
  let release
  const build = vi.fn(() => new Promise((accept, reject) => { release = () => reject(new Error('fixture failure')) }))
  const api = await startFirmwareApi({ stockPath: '/private/stock.syx', outputDir: '/private/output', port: 0, build })
  try {
    const { token } = JSON.parse(await readFile(api.credentialsPath, 'utf8'))
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    const body = JSON.stringify({ machine: 'digitone', os: '1.42', moduleIds: ['dn-eq'], version: 'TEST', riskAccepted: true })
    const first = fetch(api.url + '/build-download', { method: 'POST', headers, body })
    await vi.waitFor(() => expect(build).toHaveBeenCalledOnce())
    expect((await fetch(api.url + '/build-download', { method: 'POST', headers, body })).status).toBe(409)
    release()
    expect((await first).status).toBe(400)
    expect((await (await fetch(api.url + '/health', { headers })).json()).busy).toBe(false)
  } finally { await api.close() }
})
