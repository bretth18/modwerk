// Static release checks only. Never import/evaluate native Python or firmware.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseModuleDocument, requireModuleQualificationForPublication, requireModuleUiForPublication } from '../src/catalog/module-contract.ts'
import { requireModuleDocumentation } from './module-documentation.mjs'
import { moduleNativeSourceSha256, requireFolderQualification } from './module-qualification.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const folder = resolve(root, 'sdk/octabam/modules/sidechain-compressor')
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const document = parseModuleDocument(await json(resolve(folder, 'octamod.module.json')))
const template = document.tests.qualification
const capture = await json(resolve(folder, 'media/capture.json'))
const proof = await json(resolve(folder, 'reports/native-evidence.json'))
assert.equal(document.build, undefined)
assert.equal(document.tests.hardwareStatus, 'historical')
assert.equal(template.moduleVersion, document.version)
assert.equal(template.imageSha256, capture.imageSha256)
assert.equal(template.sourceSha256, await moduleNativeSourceSha256(folder, document))
assert.equal(proof.imageSha256, capture.imageSha256)
assert.deepEqual(template.documentation.screenshots, document.access.screenshots)
requireModuleUiForPublication(document)
// Validate draft docs against its tutorial template without claiming any qualification.
// This transient object is not parsed, serialized or used for publication.
await requireModuleDocumentation(folder, {
  ...document, tests: { ...document.tests, qualification: { documentation: template.documentation } },
})
for (const media of document.media) {
  const bytes = await readFile(resolve(folder, media.path))
  assert.ok(bytes.length < 5 * 1024 * 1024)
  assert.equal(bytes.readUInt32BE(16), 768)
  assert.equal(bytes.readUInt32BE(20), 384)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), capture.screenshots[media.path.slice(6)])
  assert.equal(media.otUi.moduleVersion, document.version)
  assert.equal(media.otUi.imageSha256, capture.imageSha256)
}
requireModuleQualificationForPublication(document)
assert.equal(await requireFolderQualification(folder, document, new Map()), 'qualified')
const thumbnail = await readFile(resolve(folder, 'presentation/thumbnail.svg'), 'utf8')
assert.match(thumbnail, /viewBox="0 0 320 192"/)
assert.match(thumbnail, /KEY/)
assert.match(thumbnail, /COMP/)
console.log('Sidechain release: strict schema, complete synchronized docs/tutorial, actual monochrome UI hashes, source binding and hardware-only approval passed; no native source executed.')
