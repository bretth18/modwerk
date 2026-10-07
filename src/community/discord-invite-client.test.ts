import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let values: Map<string, string>, claims: typeof import('./discord-invite'), request: ReturnType<typeof vi.fn>
beforeEach(async () => {
  vi.resetModules(); values = new Map(); request = vi.fn(async () => Response.json({ show: true }))
  vi.stubGlobal('fetch', request)
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
  claims = await import('./discord-invite')
})
afterEach(() => { vi.unstubAllGlobals() })

describe('invitation delivery in the browser', () => {
  it('shares the member claim across effect replay without mixing accounts', async () => {
    const first = claims.claimDiscordInvite('first')
    expect(claims.claimDiscordInvite('first')).toBe(first)
    expect(await first).toEqual({ show: true })
    await claims.claimDiscordInvite('second')
    expect(request).toHaveBeenCalledTimes(2)
    expect(values.has(claims.VISITOR_DISCORD_INVITE_KEY)).toBe(false)
  })
  it('remembers the visitor prompt across page loads, using no account request', async () => {
    expect(await claims.claimDiscordInvite(null)).toEqual({ show: true })
    expect(values.get(claims.VISITOR_DISCORD_INVITE_KEY)).toBe('1')
    vi.resetModules()
    const nextVisit = await import('./discord-invite')
    expect(await nextVisit.claimDiscordInvite(null)).toEqual({ show: false })
    expect(request).not.toHaveBeenCalled()
  })
  it('keeps storage failures nonblocking and shares the result for this visit', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Unavailable') } })
    const first = claims.claimDiscordInvite(null)
    expect(claims.claimDiscordInvite(null)).toBe(first)
    expect(await first).toEqual({ show: true })
    expect(request).not.toHaveBeenCalled()
  })
})
