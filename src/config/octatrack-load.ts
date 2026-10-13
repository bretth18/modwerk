import type { LoadReading } from '../engine/elekloader/upload-wire'

export interface LoadPoint { at: number; reading: LoadReading | null }
export function loadPath(points: LoadPoint[], key: 'cpu' | 'tracks1to4' | 'tracks5to8', now: number) {
  let path = '', connected = false, previous = 0
  for (const point of points) {
    const value = point.reading?.[key]
    if (value == null || now - point.at > 300000) { connected = false; continue }
    const x = Math.max(0, 600 - (now - point.at) / 500), y = 120 - value * .12
    path += `${connected && point.at - previous <= 6000 ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `
    connected = true; previous = point.at
  }
  return path
}
