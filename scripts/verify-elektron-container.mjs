// Local verification with the owner's own stock files (never in CI, never committed):
//   node scripts/verify-elektron-container.mjs --out DIR digitakt:/path/Digitakt_OS1.53.syx digitone:/path/...syx
// 1. Rebuilding each file from its own main OS must reproduce it byte for byte.
// 2. Depacking and repacking the main OS must give a file that passes every container check, written to DIR for digiemu.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, resolve } from 'node:path'
import { ELE3_DEVICES, inplaceDepack, mainImage, packMain, readEle3Syx, verifyEle3Build, writeEle3Syx } from '../src/engine/elektron/ele3.ts'

const args = process.argv.slice(2), outIndex = args.indexOf('--out'), out = outIndex >= 0 ? resolve(args[outIndex + 1]) : null
if (outIndex >= 0) args.splice(outIndex, 2)
if (!args.length) throw new Error('Usage: node scripts/verify-elektron-container.mjs [--out DIR] machine:/path/stock.syx ...')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
if (out) await mkdir(out, { recursive: true })
for (const arg of args) {
  const [machine, path] = [arg.slice(0, arg.indexOf(':')), arg.slice(arg.indexOf(':') + 1)]
  const device = ELE3_DEVICES[machine]
  if (!device) throw new Error('Unknown machine: ' + machine)
  const raw = new Uint8Array(await readFile(path)), stock = readEle3Syx(raw)
  const identity = writeEle3Syx(stock, stock.stored.get(device.mainSection), device)
  const same = identity.length === raw.length && identity.every((byte, index) => byte === raw[index])
  if (!same) throw new Error(basename(path) + ': rebuilding from its own main OS does not reproduce the file')
  const image = mainImage(stock, device), stockInplace = inplaceDepack(stock.stored.get(device.mainSection), device)
  if (sha(stockInplace.image) !== sha(image)) throw new Error(basename(path) + ': in-place depack of stock disagrees')
  const repacked = packMain(image), rebuilt = writeEle3Syx(stock, repacked, device, 'MW01')
  const facts = verifyEle3Build(rebuilt, stock, image, device, 'MW01')
  console.log(JSON.stringify({ file: basename(path), sha256: sha(raw), version: stock.version, sections: stock.table.map(s => s.id), writerIdentity: true, mainImageBytes: image.length, mainImageSha256: sha(image), stockInplaceGap: stockInplace.gap, repacked: { ...facts, sha256: sha(rebuilt) } }, null, 2))
  if (out) await writeFile(resolve(out, basename(path).replace(/\.syx$/, '') + '-repacked-MW01.syx'), rebuilt)
}
