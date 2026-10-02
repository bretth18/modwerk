// Precompute site menus before entering a source-tools container without Node.
import { MODULES } from '../src/catalog/modules.ts'
import { defaultChoosers } from '../src/engine/choosers.ts'
const suite = process.argv[2] ?? 'original'
const suites = {
  original: ['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch','tapehead'],
  tapehead: ['miniverb','tapeecho','euclid','repitch','tapehead','analog-bassdrum','usb-audio-out-tracks-main-cue','quantizer'],
  'tapehead-utilities': ['repitch','tapehead','usb-audio-out-tracks-main-cue','quantizer','previewvol','cc-map'],
}
if (!suites[suite] || process.argv.length > 3) throw new Error('Usage: node scripts/export-composition-menus.mjs [original|tapehead|tapehead-utilities]')
const ids = MODULES.filter(module => suites[suite].includes(module.id)).map(module => module.id), menus = []
for (let mask = 0; mask < 2 ** ids.length; mask++) for (const keep of [true, false]) menus.push(defaultChoosers(ids.filter((_, bit) => mask >> bit & 1), keep))
console.log(JSON.stringify(menus))
