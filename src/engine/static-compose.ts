import { installCoreLogger, LOGGER_RETAINED_BYTES } from './core-logger.ts'
// Loader-free composition with mandatory logging. Historical module-matrix
// proofs predate the core; downloads stay gated until full images are reverified.
import { composeAnalogBd, createAnalogBootstrap } from './analog-bd.ts'
import { defaultChoosers, composeChoosers } from './choosers.ts'
import { recoverStockDsp } from './stock-dsp.ts'
import { composeStaticDsp } from './static-dsp.ts'
import { createStaticColdFireRuntime } from './coldfire-runtime.ts'
import { createRuntimeBootstrap, BOOTSTRAP_ADDRESS } from './bootstrap.ts'
import { createPlatformOsWrites } from './platform-writes.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS } from './os-patches.ts'
/** Every write set of a loader-free build, kept apart so a verifier can compare the module-owned
 *  writes with a native build that has no logger, and prove the others leave them untouched. */
export async function planStaticOs(original: Uint8Array, ids: readonly string[], profile = defaultChoosers(ids)) {
  const cores = await recoverStockDsp(original), runtime = await createStaticColdFireRuntime(ids, original)
  const menus = await composeChoosers(original, ids, profile, runtime), dsp = await composeStaticDsp(cores, ids, menus.chooser)
  const logging = await installCoreLogger(runtime, original, ids, menus.chooser)
  const platform = createPlatformOsWrites(runtime, ids, { loader: false, reserveBytes: runtime.reserveBytes })
  return { runtime, menus, dsp, logging, platform }
}
export async function composeStaticOs(original: Uint8Array, ids: readonly string[], profile = defaultChoosers(ids)) {
  const { runtime, menus, dsp, logging, platform } = await planStaticOs(original, ids, profile)
  let patched = await applyGuardedOsWrites(original, [...menus.writes, ...dsp.writes, ...platform, ...logging.writes])
  const analog = ids.includes('analog-bassdrum') ? await composeAnalogBd(original, patched, ids, profile) : null
  if (analog) patched = analog.bytes
  const bootstrap = analog ? await createAnalogBootstrap(runtime.bytes, analog.uploads, runtime.reserveBytes - LOGGER_RETAINED_BYTES) : await createRuntimeBootstrap(runtime.bytes, runtime.reserveBytes - LOGGER_RETAINED_BYTES)
  if (OS_LOAD_ADDRESS + original.length !== BOOTSTRAP_ADDRESS) throw new Error('The runtime loader does not follow the original OS extent.')
  const bytes = new Uint8Array(patched.length + bootstrap.append.length); bytes.set(patched); bytes.set(bootstrap.append, patched.length)
  return { bytes, chooser: menus.chooser, dsp: dsp.layouts, runtime: { reservedBytes: runtime.reserveBytes, bytes: runtime.bytes.length, stage: bootstrap.layout.stage, stageEnd: bootstrap.layout.stageEnd }, caveCursor: menus.caveCursor, overflowCursor: menus.overflowCursor }
}
