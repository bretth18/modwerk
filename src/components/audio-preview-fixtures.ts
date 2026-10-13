import { waveformPeaks, type AudioPreviewClip } from './audio-preview'

/** Synthetic audition clips for the local prototype, never claims of hardware recordings. */
function demoClip(index: number): AudioPreviewClip {
  const rate = 12000, duration = 12 + index * 4
  const samples = new Float32Array(rate * duration)
  const frequencies = [110, 164.81, 146.83]
  for (let sample = 0; sample < samples.length; sample++) {
    const time = sample / rate
    const beat = time % (index === 1 ? .75 : .5)
    const attack = Math.min(1, beat * 150)
    const tail = Math.exp(-beat * (index === 1 ? 5 : 10))
    const fade = Math.min(1, time / .05, (duration - time) / .12)
    const note = frequencies[(Math.floor(time / 2) + index) % frequencies.length]
    samples[sample] = .2 * fade * attack * tail * (Math.sin(time * Math.PI * 2 * note) + .25 * Math.sin(time * Math.PI * 4 * note))
  }
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer)
  const text = (offset: number, value: string) => { for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index)) }
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let index = 0; index < samples.length; index++) view.setInt16(44 + index * 2, Math.round(samples[index] * 32767), true)
  return { id: 'demo-' + index, url: URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' })), duration, peaks: waveformPeaks([samples]), credit: 'Synthetic prototype clip' }
}

export function audioPreviewFixtures(): Record<string, AudioPreviewClip[]> {
  return { tapeecho: [demoClip(0), demoClip(1), demoClip(2)], miniverb: [demoClip(1)], tapehead: [demoClip(2)] }
}
