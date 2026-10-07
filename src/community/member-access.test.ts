import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
let storage: Map<string, string>
beforeEach(() => {
  vi.resetModules(); storage = new Map()
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
})
afterEach(() => vi.unstubAllGlobals())
describe('signup welcome delivery', () => {
  it('preserves the signup destination and consumes the inline welcome only once', async () => {
    const access = await import('./member-access')
    expect(access.takeSignupWelcome()).toBe(false)
    expect(access.welcomeHref('digitakt/configuration')).toBe('#digitakt/configuration')
    expect(access.hasSignupWelcome()).toBe(true)
    expect(access.hasSignupWelcome()).toBe(true)
    expect(access.takeSignupWelcome()).toBe(true)
    expect(access.hasSignupWelcome()).toBe(false)
    expect(access.takeSignupWelcome()).toBe(false)
    expect(access.welcomeHref('forum?category=general')).toBe('#forum?category=general')
  })
  it('survives a reload before display and disappears after display', async () => {
    const access = await import('./member-access')
    access.welcomeHref('all')
    vi.resetModules()
    const restored = await import('./member-access')
    expect(restored.takeSignupWelcome()).toBe(true)
    vi.resetModules()
    expect((await import('./member-access')).takeSignupWelcome()).toBe(false)
  })
  it('still welcomes this visit when storage is unavailable and uses a safe fallback destination', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('Unavailable') }, setItem: () => { throw new Error('Unavailable') } })
    const access = await import('./member-access')
    expect(access.welcomeHref('https://untrusted.example')).toBe('#forum')
    expect(access.takeSignupWelcome()).toBe(true)
    expect(access.takeSignupWelcome()).toBe(false)
  })
})
