const DELAYS_MS = [2000, 5000, 15000, 30000, 60000]
export type Recheck = { failed(): void; succeeded(): void; cancel(): void }
/** Repeats a failed community check with growing pauses, so a dropped connection heals without a reload.
 * A pause that ends while the tab is hidden skips its check; the focus and `online` listeners resume it. */
export function recheck(run: () => void): Recheck {
  let failures = 0, timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => { clearTimeout(timer); timer = undefined }
  return {
    failed() { cancel(); timer = setTimeout(() => { timer = undefined; if (document.visibilityState === 'visible') run() }, DELAYS_MS[Math.min(failures++, DELAYS_MS.length - 1)]) },
    succeeded() { cancel(); failures = 0 },
    cancel,
  }
}
