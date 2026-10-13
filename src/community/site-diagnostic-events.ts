import { DIAGNOSTIC_BUILD_ERRORS, DIAGNOSTIC_BUILD_KINDS, DIAGNOSTIC_BUILD_PHASES, type SiteDiagnosticEvent } from './octatrack-diagnostics-contract'

const brand = Symbol('consented diagnostic collection')
export type SiteDiagnosticContext = { readonly [brand]: true }
type Collection = { context: SiteDiagnosticContext; receive: (event: SiteDiagnosticEvent) => void; eligible: () => boolean }
let collection: Collection | undefined
const promises = new WeakMap<object, { context?: SiteDiagnosticContext; valid: () => boolean }>()

/** Activate only for the authenticated, currently consented account. No history is retained or replayed. */
export function subscribeSiteDiagnosticEvents(receive: (event: SiteDiagnosticEvent) => void, eligible: () => boolean = () => true) {
  const current: Collection = { context: { [brand]: true }, receive, eligible }
  collection = current
  return () => { if (collection === current) collection = undefined }
}
export function captureSiteDiagnosticContext() { return collection?.eligible() ? collection.context : undefined }

/** Project onto fixed enums even if a caller accidentally supplies additional private fields. */
export function emitSiteDiagnosticEvent(event: SiteDiagnosticEvent, context: SiteDiagnosticContext | undefined) {
  if (!context || collection?.context !== context || !collection.eligible()) return
  let safe: SiteDiagnosticEvent
  if (event.event === 'browser_error' || event.event === 'unhandled_rejection') safe = { event: event.event, phase: 'browser' }
  else if (event.event === 'build_failed' && DIAGNOSTIC_BUILD_KINDS.includes(event.buildKind) && DIAGNOSTIC_BUILD_PHASES.includes(event.phase) && DIAGNOSTIC_BUILD_ERRORS.includes(event.error))
    safe = { event: 'build_failed', phase: event.phase, buildKind: event.buildKind, error: event.error }
  else return
  try { collection.receive(Object.freeze(safe)) } catch { /* optional observation must not change the original operation */ }
}
export function isExpectedDiagnosticCancellation(error: unknown) {
  try { return error instanceof Error && error.name === 'AbortError' || typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError' }
  catch { return false }
}

/** Preserve sync throws, original rejection objects and pre-consent promises; failures belong to their start context. */
export function observeSiteDiagnosticOperation<T>(operation: () => Promise<T>, failure: () => SiteDiagnosticEvent, valid: () => boolean = () => true): Promise<T> {
  const context = captureSiteDiagnosticContext(), stamp = { context, valid }
  const report = (error: unknown) => {
    try {
      if (!context || !valid() || isExpectedDiagnosticCancellation(error)) return
      emitSiteDiagnosticEvent(failure(), context)
    } catch { /* observation is optional */ }
  }
  let promise: Promise<T>
  try { promise = operation() } catch (error) { report(error); throw error }
  promises.set(promise, stamp)
  if (!context) return promise
  const observed = promise.catch(error => { report(error); throw error })
  promises.set(observed, stamp)
  return observed
}

/** The consent collector owns installation and cleanup. Never inspect messages, stacks, URLs or filenames. */
export function collectBrowserDiagnosticEvents(given?: EventTarget) {
  const context = captureSiteDiagnosticContext()
  const target = given ?? (typeof window === 'undefined' ? undefined : window)
  if (!context || !target) return () => {}
  const error = (event: Event) => {
    if (!isExpectedDiagnosticCancellation((event as ErrorEvent).error)) emitSiteDiagnosticEvent({ event: 'browser_error', phase: 'browser' }, context)
  }
  const rejection = (event: Event) => {
    const rejected = event as PromiseRejectionEvent
    const stamp = rejected.promise && promises.get(rejected.promise)
    if (stamp && (stamp.context !== context || !stamp.valid())) return
    if (!isExpectedDiagnosticCancellation(rejected.reason)) emitSiteDiagnosticEvent({ event: 'unhandled_rejection', phase: 'browser' }, context)
  }
  target.addEventListener('error', error); target.addEventListener('unhandledrejection', rejection)
  return () => { target.removeEventListener('error', error); target.removeEventListener('unhandledrejection', rejection) }
}
