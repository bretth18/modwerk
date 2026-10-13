import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkPlatformLicenses, runtimeImports, SHARED_LICENSE } from './platform-licenses.mjs'
import { renderPlatformNotices } from './license-notices.mjs'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'modwerk-platform-licences-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await cp(resolve(project, 'LICENSES'), resolve(root, 'LICENSES'), { recursive: true })
  for (const folder of ['server', 'functions', 'src']) await mkdir(resolve(root, folder), { recursive: true })
  await cp(resolve(project, 'server/LICENSE'), resolve(root, 'server/LICENSE'))
  await cp(resolve(project, 'LICENSE'), resolve(root, 'LICENSE'))
  await cp(resolve(project, 'package.json'), resolve(root, 'package.json'))
  const manifest = JSON.parse(await readFile(resolve(root, 'LICENSES/platform.json'), 'utf8'))
  manifest.sharedFiles = ['src/shared.ts']; manifest.dataFiles = ['src/catalog.json']
  await writeFile(resolve(root, 'LICENSES/platform.json'), JSON.stringify(manifest))
  await writeFile(resolve(root, 'src/shared.ts'), '// SPDX-License-Identifier: ' + SHARED_LICENSE + '\n// Copyright (c) 2026 ' + manifest.licensor + '\nexport const shared = 1\n')
  await writeFile(resolve(root, 'src/catalog.json'), '{}')
  await writeFile(resolve(root, 'worker.ts'), "import { shared } from './src/shared'; import catalog from './src/catalog.json'; console.log(shared, catalog)\n")
  await writeFile(resolve(root, 'src/main.tsx'), "import { shared } from './shared'; console.log(shared)\n")
  return root
}

test('allows independent programs to use shared helpers without pulling type-only code into their runtime', async t => {
  const root = await fixture(t)
  await writeFile(resolve(root, 'server/types.ts'), "import type { Model } from '../src/gpl.ts'; export type ServerModel = Model\n")
  await checkPlatformLicenses(root)
  assert.deepEqual(runtimeImports("import type { Model } from './types'; export type { Model }; import('./runtime'); new Worker(new URL('./worker.ts', import.meta.url))", 'server.ts'), ['./runtime', './worker.ts'])
})

test('rejects a GPL runtime implementation imported by the backend through a shared helper', async t => {
  const root = await fixture(t), shared = resolve(root, 'src/shared.ts')
  await writeFile(resolve(root, 'src/gpl.ts'), 'export const value = 2\n')
  await writeFile(shared, await readFile(shared, 'utf8') + "export { value } from './gpl'\n")
  await assert.rejects(checkPlatformLicenses(root), /src\/gpl.ts: backend runtime dependency needs an ownership\/licence review/)
})

test('rejects backend implementation imports in the production GPL frontend', async t => {
  const root = await fixture(t)
  await writeFile(resolve(root, 'src/main.tsx'), "import { value } from '../server/api'; console.log(value)\n")
  await writeFile(resolve(root, 'server/api.ts'), 'export const value = 1\n')
  await assert.rejects(checkPlatformLicenses(root), /GPL frontend must not import the ELv2-only backend/)
})

test('requires a declared alternative licence for every inventoried shared file', async t => {
  const root = await fixture(t)
  await writeFile(resolve(root, 'src/shared.ts'), 'export const shared = 1\n')
  await assert.rejects(checkPlatformLicenses(root), /missing shared licence declaration/)
})

test('public notices include full terms and explicitly preserve earlier GPL grants', async t => {
  const root = await fixture(t), notices = await renderPlatformNotices(root)
  assert.ok(notices.includes(await readFile(resolve(root, 'LICENSES/Elastic-2.0.txt'), 'utf8')))
  assert.ok(notices.includes('do not revoke GPL rights granted for earlier revisions'))
  assert.ok(notices.includes('src/shared.ts'))
})
