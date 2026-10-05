import { AsyncLocalStorage } from 'node:async_hooks'

// Better Auth's lazy dynamic import can remain pending after a cold Worker request is canceled.
// nodejs_compat provides this module statically, so no request owns an initialization promise.
export async function getAsyncLocalStorage() { return AsyncLocalStorage }
