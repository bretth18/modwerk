// SPDX-License-Identifier: GPL-3.0-or-later
// The USB bench's line protocol (sdk/octabam/tools/emu/ot_emu/usb.h), spoken by
// ot_emu and by scripts/octatrack-usb-bridge.py for a real unit,
// plus the WebUSB calls UsbVendorTransport makes, carried over it.
import { createConnection } from 'node:net'

/** A bench socket: a Unix socket's path, or a TCP port on this computer (octatrack-usb-bridge.py on Windows, reached from WSL). */
export const benchEndpoint = path => /^\d+$/.test(path) ? Number(path) : path

/** One command, one reply line, in order. */
export class Bench {
  constructor(path, { timeoutMs = 60000 } = {}) { // an emulated unit under --dsp runs far below real time
    this.lines = []; this.waiters = []; this.buffer = ''; this.timeoutMs = timeoutMs
    this.transfers = Promise.resolve()
    this.socket = createConnection(benchEndpoint(path))
    this.socket.setEncoding('utf8')
    this.socket.on('data', chunk => {
      this.buffer += chunk
      for (let i; (i = this.buffer.indexOf('\n')) >= 0;) {
        const line = this.buffer.slice(0, i); this.buffer = this.buffer.slice(i + 1)
        const waiter = this.waiters.shift()
        if (waiter) waiter(line); else this.lines.push(line)
      }
    })
  }
  ready() { return new Promise((resolve, reject) => { this.socket.once('connect', resolve); this.socket.once('error', reject) }) }
  async command(line) {
    this.socket.write(line + '\n')
    const reply = this.lines.length ? this.lines.shift() : await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No reply to ' + line)), this.timeoutMs)
      this.waiters.push(value => { clearTimeout(timer); resolve(value) })
    })
    if (reply.startsWith('err')) throw new Error('Bench: ' + reply)
    return reply.split(' ')
  }
  setup(type, request, value, index, length) {
    const bytes = Buffer.alloc(8)
    bytes[0] = type; bytes[1] = request; bytes.writeUInt16LE(value, 2); bytes.writeUInt16LE(index, 4); bytes.writeUInt16LE(length, 6)
    return this.command('setup ' + bytes.toString('hex'))
  }
  /** EP0 has one pending SETUP. Keep its data and status stages together, even
   * when several WebUSB adapters or the link's keepalive share this bench. */
  transaction(operation) {
    const transfer = (this.transfers ?? Promise.resolve()).then(operation)
    // A failure releases the queue for the next explicit request, without
    // retrying any stage of the failed transfer.
    this.transfers = transfer.catch(() => {})
    return transfer
  }
  /** IN data stage then the OUT status stage; null on a stall. */
  controlIn(type, request, value, index, length) {
    return this.transaction(async () => {
      await this.setup(type, request, value, index, length)
      const reply = await this.command(`in 0 ${length}`)
      if (reply[2] === 'stall') return null
      await this.command('out 0')
      return Buffer.from(reply[2] ?? '', 'hex')
    })
  }
  /** OUT data stage then the IN status stage; false on a stall. */
  controlOut(type, request, value, index, data) {
    const bytes = Buffer.from(data)
    return this.transaction(async () => {
      await this.setup(type, request, value, index, bytes.length)
      if ((await this.command('out 0 ' + bytes.toString('hex')))[2] === 'stall') return false
      return (await this.command('in 0 64'))[2] !== 'stall'
    })
  }
}

/** The WebUSB calls UsbVendorTransport makes, carried by the bench. `fault` runs first, once. */
export const device = (bench, faults = {}) => ({
  async controlTransferIn(setup, length) {
    if (faults.before) { const fault = faults.before; faults.before = undefined; await fault() }
    const data = await bench.controlIn(0xc1, setup.request, setup.value, setup.index, length)
    return data ? { status: 'ok', data: new DataView(data.buffer, data.byteOffset, data.byteLength) } : { status: 'stall' }
  },
  async controlTransferOut(setup, data) {
    if (faults.before) { const fault = faults.before; faults.before = undefined; await fault() }
    return await bench.controlOut(0x41, setup.request, setup.value, setup.index, data)
      ? { status: 'ok', bytesWritten: data.length } : { status: 'stall', bytesWritten: 0 }
  },
})

/** Enumerate as a host does and describe the configuration as WebUSB would. On
 * `hardware` the host OS has enumerated the unit, so only descriptors are read. */
export async function enumerate(bench, hardware) {
  if (!hardware) {
    await bench.command('speed hs'); await bench.command('reset')
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  if ((await bench.controlIn(0x80, 6, 0x0100, 0, 18))?.length !== 18) throw new Error('No device descriptor.')
  if (!hardware) await bench.transaction(async () => { await bench.setup(0x00, 5, 1, 0, 0); await bench.command('in 0 64') })
  const header = await bench.controlIn(0x80, 6, 0x0200, 0, 9)
  const cfg = await bench.controlIn(0x80, 6, 0x0200, 0, header.readUInt16LE(2))
  if (!hardware) await bench.transaction(async () => { await bench.setup(0x00, 9, 1, 0, 0); await bench.command('in 0 64') })
  const interfaces = []
  for (let i = 0; i + 2 <= cfg.length && cfg[i] >= 2; i += cfg[i]) {
    if (cfg[i + 1] === 4) interfaces.push({ interfaceNumber: cfg[i + 2], alternates: [{
      interfaceClass: cfg[i + 5], interfaceSubclass: cfg[i + 6], interfaceProtocol: cfg[i + 7],
      endpoints: Array.from({ length: cfg[i + 4] }) }] })
  }
  return { interfaces }
}
