import { USB_AUDIO_REVISION, type UsbAudioLayout } from './usb-audio'

// Relative estimates anchored to the upstream USB-hook comparison. Instruction
// counts are port observations, not real-chip cycles or whole-device CPU %.
const costSource = `https://github.com/sambanks/octabam/blob/${USB_AUDIO_REVISION}/modules/usb-audio-out-tracks-post/README.md#cost`
const source = (layout: string) => `https://github.com/sambanks/octabam/blob/${USB_AUDIO_REVISION}/modules/usb-audio-out-${layout}/README.md`
export const USB_AUDIO_CPU = {
  'tracks-main-cue': { level: 'High', score: 4, instructions: 3438, source: costSource, rationale: 'Eight stereo stems plus Main and Cue. The upstream streaming USB hook executed 3,438 instructions per 16-sample block under the port.' },
  tracks: { level: 'Moderate', score: 3, instructions: 2639, source: costSource, rationale: 'Eight stereo stems, with less copy work than the 20-channel feed. The upstream streaming USB hook executed 2,639 instructions per 16-sample block under the port.' },
  'tracks-post': { level: 'High', score: 4, instructions: 4278, source: costSource, rationale: 'Eight stems plus per-track performance gain. The upstream streaming USB hook executed 4,278 instructions per block under the port. A separate MKII comparison measured +2.8 µs per frame versus pre-fader Tracks; this is not this Modwerk build or a worst-case measurement.' },
  'main-cue': { level: 'Low', score: 2, instructions: 827, source: costSource, rationale: 'Two stereo mix buses, with less copy work than the stem feeds. The upstream streaming USB hook executed 827 instructions per 16-sample block under the port.' },
  main: { level: 'Low', score: 2, instructions: null, source: source('main'), rationale: 'One stereo Main bus: the producer reads 32 mixdown words per block. Low is a source estimate; comparable streaming hook timing has not been reported.' },
  master: { level: 'Low', score: 2, instructions: null, source: source('master'), rationale: 'One stereo Track 8 feed, with no other track or Main/Cue sum. Low is a source estimate; comparable streaming hook timing has not been reported.' },
} as const
export function usbAudioCpuLoad(layout: UsbAudioLayout) { return USB_AUDIO_CPU[layout] }
