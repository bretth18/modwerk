// SPDX-License-Identifier: GPL-3.0-or-later
// Export explicit, source-authored patch recipes without reading firmware.
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { parseElemod } from '../src/engine/elektron/elemod.ts'

export function packageRecipe(plan) {
  if (plan.schemaVersion !== 1 || plan.derive || plan.stockResumes?.length || plan.stockRoutineBindings || plan.module.sites?.length) throw new Error('Only source-only, explicit patch recipes can be exported')
  const parsed = parseElemod(plan.module)
  if (parsed.format !== 2 || parsed.id !== plan.id || parsed.version !== plan.version || parsed.release.version !== plan.release || parsed.device.machine !== plan.machine) throw new Error('Recipe identity mismatch')
  const sites = plan.sites.map(site => {
    if (!['ptr', 'jsr', 'jmp'].includes(site.op)) throw new Error('Stock-dependent operations must remain local: ' + site.op)
    if (site.op === 'ptr' ? site.len !== 4 : site.len < 6 || site.len % 2) throw new Error('Invalid explicit patch length')
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(site.target)) throw new Error('Invalid patch target')
    const bytes = Buffer.alloc(site.len)
    if (site.op !== 'ptr') {
      bytes.writeUInt16BE(site.op === 'jsr' ? 0x4eb9 : 0x4ef9)
      for (let i = 6; i < site.len; i += 2) bytes.writeUInt16BE(0x4e71, i)
    }
    return { addr: site.addr, len: site.len, stock_sha256: site.stockSha256, new: bytes.toString('hex'), kind: site.op === 'ptr' ? 'data' : 'code', relocs: [[site.op === 'ptr' ? 0 : 2, 'abs32', 'sym:' + site.target, 0]] }
  })
  const module = { ...plan.module, sites }
  parseElemod(module)
  return module
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [recipe, output, mode] = process.argv.slice(2)
  if (!recipe || !output || process.argv.length > 5 || (mode && mode !== '--check')) throw new Error('Usage: node scripts/package-elemod-recipe.mjs RECIPE.json OUTPUT.elemod [--check]')
  const bytes = JSON.stringify(packageRecipe(JSON.parse(await readFile(recipe, 'utf8'))), null, 1) + '\n'
  if (mode === '--check') {
    if (await readFile(output, 'utf8') !== bytes) throw new Error('Committed package does not reproduce from source: ' + output)
  } else await writeFile(output, bytes, { flag: 'wx' })
}
