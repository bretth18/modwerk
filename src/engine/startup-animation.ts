import artwork from '../../sdk/runtime/startup/artwork.json' with { type: 'json' }
import type { OsWrite } from './os-patches.ts'

export const STARTUP_ANIMATION_VERSION = artwork.version

/** A larger stock delay starts a particle sooner. Each logo cell lands as one
 * block, sweeping left to right with a slight lean down each column. */
function particleDelay(x: number, y: number) {
  const cell = artwork.mark.cell
  return 250 - Math.floor(x / cell) * 10 - Math.floor(y / cell) * 2
}

/** Original artwork in the stock boot renderer's coordinate system. No new
 * instructions, allocation, timer changes or LED changes are installed. */
export function createStartupAnimationWrites(): OsWrite[] {
  if (artwork.schema !== 1 || artwork.width !== 128 || artwork.height !== 64 || artwork.durationMs !== 2800 || artwork.particles !== 843 || artwork.wordmark.x !== 8 || artwork.wordmark.y !== 39) throw new Error('Invalid startup animation layout.')
  for (const [layer, width, height] of [[artwork.wordmark, 110, 15], [artwork.mark, artwork.mark.rows[0]?.length ?? 0, artwork.mark.rows.length]] as const) {
    if (!width || !height || layer.rows.length !== height || layer.rows.some(row => row.length !== width || !/^[.#]+$/.test(row)) || layer.x < 0 || layer.y < 0 || layer.x + width > 128 || layer.y + height > 64) throw new Error('Invalid startup animation artwork.')
  }
  // Bit 31 is the bottom pixel of the firmware's vertically reversed bitmap.
  const wordmark = new Uint8Array(110 * 4), bitmap = new DataView(wordmark.buffer)
  for (let x = 0; x < 110; x++) {
    let column = 0
    for (let y = 0; y < 15; y++) if (artwork.wordmark.rows[y][x] === '#') column |= 1 << (17 + y)
    bitmap.setUint32(x * 4, column)
  }
  const points: { x: number; y: number; delay: number }[] = []
  for (const [y, row] of artwork.mark.rows.entries()) for (let x = 0; x < row.length; x++) if (row[x] === '#') {
    const delay = particleDelay(x, y)
    // The renderer subtracts 10 from Y and its smallest 7×7 sprite has a
    // lit pixel at (3,3): the final LCD pixel is (63 + X, 21 - Y).
    points.push({ x: artwork.mark.x + x - 63, y: 21 - (artwork.mark.y + y), delay })
  }
  if (!points.length || points.length > artwork.particles) throw new Error('Startup animation exceeds the stock particle budget.')
  const particles = new Uint8Array(artwork.particles * 6), table = new DataView(particles.buffer)
  // Reuse the stock 843-record loop. Spare records repeat a point and land
  // on the same pixel at the same time.
  for (let i = 0; i < artwork.particles; i++) {
    const point = points[i < points.length ? i : (i - points.length) * 137 % points.length]
    table.setInt16(i * 6, point.x)
    table.setInt16(i * 6 + 2, point.y)
    table.setInt16(i * 6 + 4, point.delay)
  }
  return ([['particles', particles], ['wordmark', wordmark]] as const).map(([key, bytes]) => {
    const guard = artwork.guards[key]
    if (guard.bytes !== bytes.length) throw new Error('Invalid startup animation guard size.')
    return { address: guard.address, guardLength: guard.bytes, guardSha256: guard.sha256, bytes, note: 'VAC startup ' + key }
  })
}
