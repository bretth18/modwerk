// The selections a module is compared on with native octabam (owner decision, 5 October 2026): a coverage set instead
// of every combination, so the comparison grows with the number of modules rather than doubling with each one.
// Shared by scripts/module-verify.mjs, which runs it, and the catalog test, which requires it for new modules.

/** The modules a new module is compared beside: every offered module except MIDI Scenes, which only builds alone. */
export function comparisonPool(availableIds) {
  return availableIds.filter(id => id !== 'midi-scenes')
}

// A small deterministic generator, so the same module and pool always give the same sample.
function random(seedText) {
  let seed = 2166136261
  for (const char of seedText) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The selections that contain `id`, each built with and without the stock FX2 effects:
 *   - the module alone;
 *   - beside each other module;
 *   - every module together, and every module together but one (the fullest selections, where space runs out);
 *   - a fixed sample of selections in between, around where selections start being refused.
 * Analog BD takes minutes per native build and refuses every DSP effect, so it only appears beside the module.
 */
export function coverageSelections(id, pool, { sample = 24 } = {}) {
  if (!pool.includes(id)) throw new Error(id + ' is not in the comparison pool')
  const order = new Map(pool.map((module, index) => [module, index]))
  const sorted = ids => [...new Set(ids)].sort((a, b) => order.get(a) - order.get(b))
  const others = pool.filter(module => module !== id), light = others.filter(module => module !== 'analog-bassdrum')
  const sets = new Map()
  const add = ids => { const selection = sorted([id, ...ids]); sets.set(selection.join('+'), selection) }
  add([])
  for (const other of others) add([other])
  add(light)
  for (const left of light) add(light.filter(module => module !== left))
  const next = random(id + ':' + pool.join(','))
  let added = 0
  for (let tries = 0; added < sample && tries < sample * 50; tries++) {
    // Two other modules up to all but one, drawn by a Fisher-Yates shuffle.
    const size = 2 + Math.floor(next() * Math.max(1, light.length - 2)), shuffled = [...light]
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] }
    const before = sets.size
    add(shuffled.slice(0, size))
    if (sets.size > before) added++
  }
  return [...sets.values()].flatMap(ids => [true, false].map(keepStockFx2 => ({ ids, keepStockFx2 })))
}

export const selectionKey = (ids, keepStockFx2) => [...ids].sort().join('+') + ':' + keepStockFx2
