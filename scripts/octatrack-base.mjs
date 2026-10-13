// SPDX-License-Identifier: GPL-3.0-or-later
// The committed Octatrack base package (src/engine/assets/octatrack-base.elemod and its fills), rebuilt from source
// and your own OS 1.40C file, then proven three ways: it carries no stock bytes (check_stock_free.py), it is the
// committed one (or, with --write, becomes it), and the browser's path (octatrack-base.ts, the kit in TypeScript)
// builds a .bin byte-identical to build_core.py's NOT_FLASH_CANDIDATE.bin, which passes check_flash_safety.py.
// With --out the browser-built .bin, its MAIN.raw and build_core.py's proofs.json and symbols.json are saved there,
// a new directory outside Git: what `npm run device -- boot DIR` and the emulator's run scripts read. Firmware and generated images never enter the checkout.
//
//   npm run octatrack:base -- --stock OCTATRACK_OS1.40C.bin [--upstream ELEKLOADER] [--write] [--out NEW-DIR]
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { sha } from '../vendor/elekloader/kit/src/bytes.ts'
import * as formats from '../vendor/elekloader/kit/src/formats.ts'
import { buildBase } from '../src/engine/elekloader/octatrack-base.ts'

const { values: args } = parseArgs({ options: {
  stock: { type: 'string' }, upstream: { type: 'string', default: join(homedir(), '.cache/modwerk-upstream/elekloader') },
  write: { type: 'boolean', default: false }, out: { type: 'string' },
} })
if (!args.stock) throw new Error('Usage: npm run octatrack:base -- --stock OCTATRACK_OS1.40C.bin [--upstream ELEKLOADER] [--write] [--out NEW-DIR]')
const root = resolve(import.meta.dirname, '..'), here = join(root, 'sdk/machines/octatrack/elekloader')
const committed = { package: join(root, 'src/engine/assets/octatrack-base.elemod'), fills: join(root, 'src/engine/assets/octatrack-base-fills.json'),
  sources: join(root, 'src/engine/assets/octatrack-base-sources.json') }
const asm = process.env.ELEKLOADER_DSP_ASM ?? join(homedir(), '.cache/modwerk-upstream/octabam/vendor/dsp56300/build/source/dsp_host/dsp_asm')
const python = (script, ...rest) => execFileSync('python3', ['-B', join(here, script), ...rest], { stdio: 'inherit', env: { ...process.env, ELEKLOADER_DSP_ASM: asm } })

const core = join(mkdtempSync(join(tmpdir(), 'modwerk-base-')), 'core')
python('build_core.py', '--stock', args.stock, '--upstream', args.upstream, '--output', core, '--dsp-loader')
python('check_stock_free.py', join(core, 'base.elemod'), '--stock', args.stock, '--upstream', args.upstream)
for (const [key, file] of [['package', 'base.elemod'], ['fills', 'base-fills.json'], ['sources', 'base-sources.json']]) {
  const fresh = readFileSync(join(core, file))
  if (args.write) writeFileSync(committed[key], fresh)
  else assert(existsSync(committed[key]) && fresh.equals(readFileSync(committed[key])), committed[key] + ' is not what this source builds: run with --write and commit it.')
}

const stock = new Uint8Array(readFileSync(args.stock))
const browser = await buildBase(stock, readFileSync(committed.package, 'utf8'), JSON.parse(readFileSync(committed.fills, 'utf8')))
const native = new Uint8Array(readFileSync(join(core, 'NOT_FLASH_CANDIDATE.bin')))
assert.equal(browser.sha256, sha(native), 'The browser-built .bin differs from build_core.py\'s.')
python('check_flash_safety.py', '--stock', args.stock, '--build', core, '--upstream', args.upstream)
console.log('package ' + sha(readFileSync(committed.package)) + ', fills ' + sha(readFileSync(committed.fills)))
console.log('browser .bin = build_core.py .bin: ' + browser.sha256 + ' (' + browser.bin.length + ' bytes)')
if (args.out) {
  let tracked = true
  try { execFileSync('git', ['-C', dirname(resolve(args.out)), 'rev-parse', '--show-toplevel'], { stdio: 'pipe' }) } catch { tracked = false }
  if (tracked) throw new Error('Save firmware outside every Git checkout.')
  mkdirSync(args.out)  // new, so nothing is overwritten
  const [, device] = await formats.load(stock)
  writeFileSync(join(args.out, 'NOT_FLASH_CANDIDATE.bin'), browser.bin)
  writeFileSync(join(args.out, 'MAIN.raw'), formats.mainImage(formats.parse(browser.bin, device), device))
  for (const name of ['proofs.json', 'symbols.json']) copyFileSync(join(core, name), join(args.out, name))
  console.log('saved ' + resolve(args.out) + ': NOT_FLASH_CANDIDATE.bin, MAIN.raw, proofs.json, symbols.json')
}
