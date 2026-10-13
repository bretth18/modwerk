// SPDX-License-Identifier: GPL-3.0-or-later
import { it, expect, vi } from 'vitest'
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFrontendTools } from './frontend-mcp.mjs'

it('refuses native Windows before reading credentials, building the site or creating a workspace', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'modwerk-mcp-windows-refusal-'))
  const workspace = join(parent, 'new-workspace'), credentials = join(parent, 'credentials.json')
  try {
    await writeFile(credentials, 'private invalid credentials untouched', { mode: 0o600 })
    const original = process
    try {
      // Test the actual startup entry point; no production platform override.
      vi.stubGlobal('process', new Proxy(original, { get: (target, key) => key === 'platform' ? 'win32' : Reflect.get(target, key) }))
      await expect(createFrontendTools({ dataDir: workspace, sessionFile: credentials, root: join(parent, 'missing-source') }))
        .rejects.toThrow('Native Windows MCP is unavailable')
    } finally { vi.unstubAllGlobals() }
    await expect(access(workspace)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(credentials, 'utf8')).toBe('private invalid credentials untouched')
  } finally { await rm(parent, { recursive: true, force: true }) }
})
