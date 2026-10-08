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
    expect(values.get(claims.VISITOR_DISCORD_INVITE_KEY)).toBe('1')
    expect(claims.discordInviteHandledHere()).toBe(true)
  })
  it('carries a browser invitation, from the former popup or a public Discord card, into the account claim on a new visit', async () => {
    expect(claims.discordInviteHandledHere()).toBe(false)
    claims.rememberDiscordInviteHere()
    vi.resetModules()
    const nextVisit = await import('./discord-invite')
    expect(nextVisit.discordInviteHandledHere()).toBe(true)
    await nextVisit.claimDiscordInvite('signed-in')
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ alreadyShown: true })
  })
  it('does not consume a browser invitation when the member claim fails', async () => {
    request.mockRejectedValueOnce(new Error('Offline'))
    await expect(claims.claimDiscordInvite('member')).rejects.toThrow('community service')
    expect(values.has(claims.VISITOR_DISCORD_INVITE_KEY)).toBe(false)
    await claims.claimDiscordInvite('member')
    expect(request).toHaveBeenCalledTimes(2)
  })
  it('remembers a handled invitation for this visit when storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Unavailable') }, setItem: () => { throw new Error('Unavailable') } })
    expect(claims.discordInviteHandledHere()).toBe(false)
    claims.rememberDiscordInviteHere()
    expect(claims.discordInviteHandledHere()).toBe(true)
  })
})
