// SPDX-License-Identifier: GPL-3.0-or-later
// The SysEx transport of a Digitakt / Digitone mk1 OS file. Format documented by elektron-firmware-tool (MIT, Marcel
// Bierling) and digikit / elekloader (GPL-2.0-or-later, Em D and irpina); this implementation follows their transport.
// No firmware content is embedded here.

export const MANUFACTURER = [0x00, 0x20, 0x3c] as const
export const FIRST_COUNTER = 242
export const CHUNK_SIZE = 101 // decoded bytes carried by one 128-byte data message
export const DATA_MESSAGE_SIZE = 128
export const FRAMING_MESSAGE_SIZE = 16

/** Raw .syx bytes -> its messages, each from F0 to F7 inclusive. */
export function splitMessages(raw: Uint8Array): Uint8Array[] {
  const messages: Uint8Array[] = []
  for (let start = 0; start < raw.length;) {
    if (raw[start] !== 0xf0) throw new Error('Byte ' + start + ' does not start a SysEx message.')
    const end = raw.indexOf(0xf7, start)
    if (end < 0) throw new Error('The SysEx message at byte ' + start + ' has no end.')
    messages.push(raw.subarray(start, end + 1))
    start = end + 1
  }
  return messages
}

/** Data messages -> the decoded stream: each payload (bytes 10..125) is 8-in-7 encoded. */
export function decodeDataMessages(messages: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(messages.length * CHUNK_SIZE)
  let size = 0
  for (const message of messages) {
    const payload = message.subarray(10, 126)
    for (let k = 0; k < payload.length;) {
      const marker = payload[k++]
      for (let n = 0; n < 7 && k < payload.length; n++) output[size++] = payload[k++] | ((marker >> (6 - n)) & 1 ? 0x80 : 0)
    }
  }
  return output.slice(0, size)
}

/** Bytes -> 8-in-7: one marker per group of up to seven bytes holding their high bits, most significant first. */
export function encode8in7(data: Uint8Array): Uint8Array {
  const output = new Uint8Array(Math.ceil(data.length / 7) * 8)
  let size = 0
  for (let start = 0; start < data.length; start += 7) {
    const markerAt = size++
    let marker = 0
    for (let n = 0; n < 7 && start + n < data.length; n++) {
      const byte = data[start + n]
      if (byte & 0x80) marker |= 1 << (6 - n)
      output[size++] = byte & 0x7f
    }
    output[markerAt] = marker
  }
  return output.slice(0, size)
}

/** The preamble's checksum: the sum of (1-based word index XOR big-endian word) over the container, mod 2^32. */
export function contentChecksum(container: Uint8Array): number {
  const view = new DataView(container.buffer, container.byteOffset, container.byteLength)
  let sum = 0
  for (let index = 1; index <= container.length >>> 2; index++) sum = (sum + ((index ^ view.getUint32((index - 1) * 4)) >>> 0)) >>> 0
  return sum
}

/** Byte 125 of a data message, from its body (the message without F0/F7) and the file's transfer constant. */
export function packetChecksum(body: Uint8Array, transferConstant: number): number {
  let total = transferConstant
  for (let i = 0; i < 119; i++) total += body[6 + i] ^ (i + transferConstant)
  return total & 0x7f
}

export function framingCount(message: Uint8Array): number { return (message[12] << 14) | (message[13] << 7) | message[14] }

export function withFramingCount(message: Uint8Array, count: number): Uint8Array {
  const result = message.slice()
  result[12] = (count >> 14) & 0x7f; result[13] = (count >> 7) & 0x7f; result[14] = count & 0x7f
  return result
}

/** A decoded stream -> .syx bytes, framed by the stock file's framing messages with their count updated. */
export function encodeSyx(stream: Uint8Array, deviceId: number, framingStart: Uint8Array, framingEnd: Uint8Array): Uint8Array {
  const transferConstant = framingStart[8]
  const count = Math.ceil(stream.length / CHUNK_SIZE)
  const output = new Uint8Array(2 * FRAMING_MESSAGE_SIZE + count * DATA_MESSAGE_SIZE)
  output.set(withFramingCount(framingStart, count), 0)
  let at = FRAMING_MESSAGE_SIZE
  for (let index = 0; index < count; index++) {
    const chunk = new Uint8Array(CHUNK_SIZE)
    chunk.set(stream.subarray(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE))
    const counter = FIRST_COUNTER + index
    const message = output.subarray(at, at + DATA_MESSAGE_SIZE)
    message.set([0xf0, ...MANUFACTURER, deviceId, 0x00, 0x7e, (counter >> 14) & 0x7f, (counter >> 7) & 0x7f, counter & 0x7f])
    message.set(encode8in7(chunk), 10)
    message[126] = packetChecksum(message.subarray(1, 127), transferConstant)
    message[127] = 0xf7
    at += DATA_MESSAGE_SIZE
  }
  output.set(withFramingCount(framingEnd, count), at)
  return output
}
