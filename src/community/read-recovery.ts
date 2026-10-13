const DELAYS_MS = [2000, 5000, 15000, 30000, 60000]
export type ReadAttempt = { finish(reachable?: boolean): void }

/** All reads to one backend share a cooldown and one recovery probe during an outage. */
export function createReadRecovery() {
  let failures = 0, resumeAt = 0, version = 0
  let probe: { done: Promise<void>; resolve(): void } | null = null

  async function begin(signal?: AbortSignal): Promise<ReadAttempt | null> {
    while (probe) {
      if (signal?.aborted) return null
      const pending = probe.done
      let aborted: (() => void) | undefined
      try {
        await (signal ? Promise.race([pending, new Promise<void>(resolve => {
          aborted = resolve
          signal.addEventListener('abort', aborted, { once: true })
        })]) : pending)
      } finally { if (aborted) signal?.removeEventListener('abort', aborted) }
    }
    if (signal?.aborted || Date.now() < resumeAt) return null
    const startedVersion = version
    const ownProbe = failures ? (() => {
      let resolve!: () => void
      const done = new Promise<void>(complete => { resolve = complete })
      return probe = { done, resolve }
    })() : null
    let finished = false
    return { finish(reachable) {
      if (finished) return
      finished = true
      // Other reads already in flight must not lengthen a cooldown or clear a newer outage.
      if (startedVersion === version && reachable !== undefined) {
        if (reachable) {
          if (failures) { failures = 0; resumeAt = 0; version++ }
        } else { resumeAt = Date.now() + DELAYS_MS[Math.min(failures++, DELAYS_MS.length - 1)]; version++ }
      }
      if (ownProbe) { probe = null; ownProbe.resolve() }
    } }
  }
  return { begin }
}
