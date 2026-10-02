import { expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { requireMonochromePng } from './module-documentation.mjs'
import { moduleSourcePaths, moduleSourceFingerprint } from './module-source.mjs'

it('excludes the CC Map draft from compilation and preserves approved source-package identity', async () => {
  const root = resolve('.')
  const build = JSON.parse(await readFile(resolve(root, 'src/engine/assets/module-build.json'), 'utf8'))
  expect((await moduleSourcePaths(root)).some(path => path.includes('cc-map'))).toBe(false)
  expect(await moduleSourceFingerprint(root)).toBe(build.sourceTreeSha256)
})

it('retains actual monochrome LCD PNGs with version-bound provenance', async () => {
  const folder = resolve('sdk/drafts/cc-map')
  const document = JSON.parse(await readFile(resolve(folder, 'octamod.module.json'), 'utf8'))
  for (const item of document.media) requireMonochromePng(await readFile(resolve(folder, item.path)))
})
